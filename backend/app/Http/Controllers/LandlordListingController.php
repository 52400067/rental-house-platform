<?php

namespace App\Http\Controllers;

use App\Http\Resources\ListingDetailResource;
use App\Http\Resources\ListingSummaryResource;
use App\Models\Listing;
use App\Models\ListingImage;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Landlord listing management (API_CONTRACT §4 - "Chủ nhà: quản lý tin đăng").
 * All actions require the landlord role and ownership of the listing.
 */
class LandlordListingController extends Controller
{
    /** Validation rules shared by store and update. */
    private function rules(bool $creating = false): array
    {
        $rules = [
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'min:5', 'max:200'],
            'type' => [$creating ? 'required' : 'sometimes', Rule::in([
                Listing::TYPE_ROOM, Listing::TYPE_APARTMENT, Listing::TYPE_HOUSE,
            ])],
            'price' => [$creating ? 'required' : 'sometimes', 'integer', 'between:100000,100000000'],
            'area_m2' => [$creating ? 'required' : 'sometimes', 'numeric', 'between:5,1000'],
            'address' => [$creating ? 'required' : 'sometimes', 'string', 'max:300'],
            'latitude' => [$creating ? 'required' : 'sometimes', 'numeric', 'between:-90,90'],
            'longitude' => [$creating ? 'required' : 'sometimes', 'numeric', 'between:-180,180'],
            'district_id' => [$creating ? 'required' : 'sometimes', 'integer', 'exists:districts,id'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'amenity_ids' => ['sometimes', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
        ];

        if (! $creating) {
            $rules['status'] = ['sometimes', Rule::in([
                Listing::STATUS_AVAILABLE, Listing::STATUS_RENTED, Listing::STATUS_HIDDEN,
            ])];
        }

        return $rules;
    }

    private function messages(): array
    {
        return [
            'required' => 'Cần cung cấp :attribute.',
            'string' => ':attribute phải là chuỗi.',
            'integer' => ':attribute phải là số nguyên.',
            'numeric' => ':attribute phải là số.',
            'array' => ':attribute phải là một mảng.',
            'min.string' => ':attribute phải có ít nhất :min ký tự.',
            'max.string' => ':attribute không được vượt quá :max ký tự.',
            'between.numeric' => ':attribute phải trong khoảng :min đến :max.',
            'exists' => ':attribute không tồn tại.',
            'in' => ':attribute không hợp lệ.',
        ];
    }

    private function attributes(): array
    {
        return [
            'title' => 'Tiêu đề',
            'type' => 'Loại tin',
            'price' => 'Giá',
            'area_m2' => 'Diện tích',
            'address' => 'Địa chỉ',
            'latitude' => 'Vĩ độ',
            'longitude' => 'Kinh độ',
            'district_id' => 'Quận',
            'description' => 'Mô tả',
            'amenity_ids' => 'Tiện ích',
            'amenity_ids.*' => 'Tiện ích',
            'status' => 'Trạng thái',
            'images' => 'Ảnh',
            'images.*' => 'Ảnh',
        ];
    }

    /**
     * GET /api/my/listings - all statuses, optional status filter, paginated.
     */
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()
            ->listings()
            ->with(['district', 'coverImage'])
            ->withCount('reviews')
            ->withAvg('reviews', 'listing_rating')
            ->orderByDesc('id');

        if (! empty($request->query('status'))) {
            $query->where('status', $request->query('status'));
        }

        $page = $query->paginate($this->perPage($request));

        // Landlord view: is_favorited is always false.
        $request->attributes->set('favorited_listing_ids', []);

        return $this->paginated($page, ListingSummaryResource::class, $request);
    }

    /**
     * POST /api/listings - create a listing, status defaults to available.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules(creating: true), $this->messages(), $this->attributes());

        $listing = $request->user()->listings()->create([
            ...collect($data)->except('amenity_ids')->all(),
            'status' => Listing::STATUS_AVAILABLE,
        ]);

        if (array_key_exists('amenity_ids', $data)) {
            $listing->amenities()->sync($data['amenity_ids']);
        }

        return response()->json([
            'data' => (new ListingDetailResource($listing->load(['district', 'coverImage', 'images', 'amenities', 'landlord'])))->resolve($request),
        ], 201);
    }

    /**
     * PUT /api/listings/{id} - partial update, landlord may also change status.
     */
    public function update(Request $request, Listing $listing): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        $data = $request->validate($this->rules(), $this->messages(), $this->attributes());

        $listing->update(collect($data)->except('amenity_ids')->all());

        if (array_key_exists('amenity_ids', $data)) {
            $listing->amenities()->sync($data['amenity_ids']);
        }

        return response()->json([
            'data' => (new ListingDetailResource($listing->fresh(['district', 'coverImage', 'images', 'amenities', 'landlord'])))->resolve($request),
        ]);
    }

    /**
     * DELETE /api/listings/{id} - delete the listing AND its image files.
     */
    public function destroy(Request $request, Listing $listing): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        // Delete image files on disk before the cascading row delete.
        Storage::disk('public')->delete(
            $listing->images()->pluck('path')->all(),
        );

        $listing->delete();

        return response()->json(['data' => null]);
    }

    /**
     * POST /api/listings/{id}/images - upload 1..n images (jpg/png/webp,
     * 2 MB each, 5 total per listing). Returns ALL images of the listing;
     * the smallest id is the cover.
     */
    public function uploadImages(Request $request, Listing $listing): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        $request->validate([
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ], $this->messages(), $this->attributes());

        $existingCount = $listing->images()->count();
        $newFiles = $request->file('images', []);

        if ($existingCount + count($newFiles) > 5) {
            return response()->json([
                'message' => 'Tin đăng chỉ có tối đa 5 ảnh.',
                'errors' => ['images' => ['Tin đăng chỉ có tối đa 5 ảnh (hiện có '.$existingCount.').']],
            ], 422);
        }

        foreach ($newFiles as $file) {
            // Trust the validated mime type when the client sends no extension.
            $extension = $file->getClientOriginalExtension() ?: $file->extension();
            $path = 'listings/'.Str::uuid()->toString().'.'.$extension;
            Storage::disk('public')->put($path, $file->getContent());
            $listing->images()->create(['path' => $path]);
        }

        $listing->refresh()->load('images');

        return response()->json([
            'data' => $listing->images->sortBy('id')->values()->map(fn (ListingImage $image) => [
                'id' => $image->id,
                'url' => Storage::disk('public')->url($image->path),
            ])->all(),
        ]);
    }

    /**
     * DELETE /api/listings/{id}/images/{image_id} - remove the row AND the file.
     */
    public function deleteImage(Request $request, Listing $listing, ListingImage $image): JsonResponse
    {
        $this->authorizeOwnership($request, $listing);

        // The image must belong to this listing (else treat as not found).
        if ($image->listing_id !== $listing->id) {
            abort(404);
        }

        Storage::disk('public')->delete($image->path);
        $image->delete();

        return response()->json(['data' => null]);
    }

    /** 403 with the standard message unless the current user owns the listing. */
    private function authorizeOwnership(Request $request, Listing $listing): void
    {
        if ($listing->user_id !== $request->user()->id) {
            // Rendered as { message: "Bạn không có quyền..." } by the handler.
            throw new AuthorizationException;
        }
    }
}
