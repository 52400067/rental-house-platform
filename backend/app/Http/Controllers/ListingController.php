<?php

namespace App\Http\Controllers;

use App\Http\Resources\ListingDetailResource;
use App\Http\Resources\ListingSummaryResource;
use App\Http\Resources\ReviewResource;
use App\Models\Listing;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Public listing browse (API_CONTRACT §4 - "Duyệt tin đăng").
 */
class ListingController extends Controller
{
    public const PER_PAGE_DEFAULT = 12;

    public const PER_PAGE_MAX = 50;

    /**
     * Haversine distance (km) between a school and listings - PostgreSQL
     * flavor from ERD §4 (parameters must be CAST to float8; placeholder
     * order: school lat, school lng, school lat).
     */
    private const DISTANCE_SQL = '6371 * ACOS(LEAST(1, COS(RADIANS(CAST(? AS float8))) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(CAST(? AS float8))) + SIN(RADIANS(CAST(? AS float8))) * SIN(RADIANS(latitude))))';

    public function index(Request $request): JsonResponse
    {
        // ---------------------------------------------------------------
        // Validation (422 with Vietnamese messages, per API_CONTRACT §1)
        // ---------------------------------------------------------------
        $messages = [
            'integer' => ':attribute phải là số nguyên.',
            'numeric' => ':attribute phải là số.',
            'string' => ':attribute phải là chuỗi.',
            'array' => ':attribute phải là một mảng.',
            'min.numeric' => ':attribute phải tối thiểu :min.',
            'max.numeric' => ':attribute không được vượt quá :max.',
            'max.string' => ':attribute không được vượt quá :max ký tự.',
            'gte' => ':attribute phải lớn hơn hoặc bằng :value.',
            'exists' => ':attribute không tồn tại.',
            'in' => ':attribute không hợp lệ.',
        ];

        $attributes = [
            'price_min' => 'Giá tối thiểu',
            'price_max' => 'Giá tối đa',
            'ward_id' => 'Quận',
            'type' => 'Loại tin',
            'amenity_ids' => 'Tiện ích',
            'max_km' => 'Bán kính (km)',
            'sort' => 'Sắp xếp',
            'page' => 'Trang',
            'per_page' => 'Số tin mỗi trang',
            'q' => 'Từ khóa',
            'school_id' => 'Trường',
        ];

        $validated = $request->validate([
            'price_min' => ['nullable', 'integer', 'min:0'],
            // gte:price_min would fail when price_min is absent, so the
            // cross-field check only runs when both bounds are provided.
            'price_max' => ['nullable', 'integer', 'min:0', function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                $min = $request->input('price_min');
                if ($min !== null && $min !== '' && (int) $value < (int) $min) {
                    $fail('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
                }
            }],
            'ward_id' => ['nullable', 'integer', 'exists:wards,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'type' => ['nullable', Rule::in([Listing::TYPE_ROOM, Listing::TYPE_APARTMENT, Listing::TYPE_HOUSE])],
            'amenity_ids' => ['nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
            'max_km' => ['nullable', 'numeric', 'min:0', 'max:500'],
            'sort' => ['nullable', Rule::in(['newest', 'price_asc', 'price_desc', 'distance', 'rating'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::PER_PAGE_MAX],
            'q' => ['nullable', 'string', 'max:200'],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
        ], $messages, $attributes);

        // max_km and sort=distance require school_id.
        if ((isset($validated['max_km']) || ($validated['sort'] ?? null) === 'distance') && empty($validated['school_id'])) {
            return response()->json([
                'message' => 'Cần cung cấp school_id khi dùng max_km hoặc sort=distance.',
                'errors' => ['school_id' => ['Cần cung cấp school_id khi dùng max_km hoặc sort=distance.']],
            ], 422);
        }

        $perPage = $validated['per_page'] ?? self::PER_PAGE_DEFAULT;

        // ---------------------------------------------------------------
        // Base query: only available listings
        // ---------------------------------------------------------------
        $query = Listing::query()
            ->where('status', Listing::STATUS_AVAILABLE)
            ->with(['ward.city', 'coverImage'])
            ->withCount('reviews')
            ->withAvg('reviews', 'listing_rating');

        // ---------------------------------------------------------------
        // Filters
        // ---------------------------------------------------------------
        if (! empty($validated['q'])) {
            $q = $validated['q'];
            // ILIKE: PostgreSQL case-insensitive search (ERD §4).
            $query->where(function ($query) use ($q) {
                $query->where('title', 'ilike', "%{$q}%")
                    ->orWhere('address', 'ilike', "%{$q}%");
            });
        }

        if (isset($validated['price_min'])) {
            $query->where('price', '>=', $validated['price_min']);
        }

        if (isset($validated['price_max'])) {
            $query->where('price', '<=', $validated['price_max']);
        }

        if (! empty($validated['ward_id'])) {
            $query->where('ward_id', $validated['ward_id']);
        }

        // City filter: listing's ward belongs to the selected provincial unit.
        if (! empty($validated['city_id'])) {
            $query->whereHas('ward', fn ($q) => $q->where('city_id', $validated['city_id']));
        }

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        // Listing must have ALL requested amenities.
        foreach ($validated['amenity_ids'] ?? [] as $amenityId) {
            $query->whereHas('amenities', fn ($q) => $q->where('amenities.id', $amenityId));
        }

        // ---------------------------------------------------------------
        // Distance (only when school_id is present)
        // ---------------------------------------------------------------
        if (! empty($validated['school_id'])) {
            $school = DB::table('schools')->find($validated['school_id']);
            $schoolBindings = [(float) $school->latitude, (float) $school->longitude, (float) $school->latitude];

            $query->addSelect(DB::raw(self::DISTANCE_SQL.' AS distance_km'));
            // 'select' bindings are flattened BEFORE 'where' bindings by the
            // query builder, matching the placeholder order in the SQL above.
            $query->addBinding($schoolBindings, 'select');

            if (isset($validated['max_km'])) {
                $query->whereRaw(self::DISTANCE_SQL.' <= ?', array_merge($schoolBindings, [$validated['max_km']]));
            }
        }

        // ---------------------------------------------------------------
        // Sorting
        // ---------------------------------------------------------------
        match ($validated['sort'] ?? 'newest') {
            'price_asc' => $query->orderBy('price'),
            'price_desc' => $query->orderBy('price', 'desc'),
            'distance' => $query->orderBy('distance_km'),
            // PostgreSQL cannot reference the SELECT alias inside an ORDER BY
            // expression, so the aggregate is repeated as a correlated subquery.
            'rating' => $query->orderByRaw(
                'CASE WHEN (SELECT AVG(listing_rating) FROM reviews WHERE reviews.listing_id = listings.id) IS NULL THEN 1 ELSE 0 END, '
                .'(SELECT AVG(listing_rating) FROM reviews WHERE reviews.listing_id = listings.id) DESC'
            ),
            default => $query->orderBy('id', 'desc'), // newest
        };

        // Deterministic tiebreaker for stable pagination.
        $query->orderBy('id', 'desc');

        // ---------------------------------------------------------------
        // Pagination + single favorited-ids pre-fetch
        // ---------------------------------------------------------------
        $page = $query->paginate($perPage);

        $request->attributes->set('favorited_listing_ids', $this->favoritedListingIds($request, $page->getCollection()));

        return response()->json([
            'data' => ListingSummaryResource::collection($page->getCollection())->resolve($request),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => (int) $perPage,
                'total' => $page->total(),
            ],
        ]);
    }

    /**
     * Ids of listings on this page favorited by the current (student) user -
     * exactly ONE query. Guests and landlords get an empty set.
     */
    private function favoritedListingIds(Request $request, $listings): array
    {
        $user = $request->user('sanctum');

        if (! $user || $user->role !== User::ROLE_STUDENT || $listings->isEmpty()) {
            return [];
        }

        return $user->favorites()
            ->whereIn('listings.id', $listings->modelKeys())
            ->pluck('listings.id')
            ->all();
    }

    /**
     * GET /api/listings/{id} - public detail. Hidden listings 404 for
     * everyone except the owner; rented listings stay visible.
     */
    public function show(Request $request, Listing $listing): JsonResponse
    {
        $user = $request->user('sanctum');

        // Hidden listings: 404 unless the viewer is the owner landlord.
        if ($listing->status === Listing::STATUS_HIDDEN
            && (! $user || $user->id !== $listing->user_id)) {
            abort(404);
        }

        $listing->load(['ward.city', 'coverImage', 'images', 'amenities', 'landlord'])
            ->loadCount('reviews')
            ->loadAvg('reviews', 'listing_rating');

        // Personalize is_favorited when a logged-in student is viewing.
        $favorited = $user && $user->role === User::ROLE_STUDENT
            ? $user->favorites()->where('listings.id', $listing->id)->exists()
            : false;
        $request->attributes->set('favorited_listing_ids', $favorited ? [$listing->id] : []);

        return response()->json([
            'data' => (new ListingDetailResource($listing))->resolve($request),
        ]);
    }

    /**
     * GET /api/listings/{id}/reviews - public, newest first, paginated.
     */
    public function reviews(Request $request, Listing $listing): JsonResponse
    {
        $page = $listing->reviews()
            ->with('student:id,name')
            ->orderByDesc('id')
            ->paginate($this->perPage($request));

        $request->attributes->set('review_pagination', $page);

        return $this->paginated($page, ReviewResource::class, $request);
    }

    /**
     * POST /api/listings/{id}/reviews - students only. Requires an existing
     * conversation about this listing; one review per student per listing.
     */
    public function storeReview(Request $request, Listing $listing): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'listing_rating' => ['required', 'integer', 'between:1,5'],
            'landlord_rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ], [
            'required' => 'Cần cung cấp :attribute.',
            'integer' => ':attribute phải là số nguyên.',
            'between' => ':attribute phải từ :min đến :max sao.',
            'max.string' => ':attribute không được vượt quá :max ký tự.',
        ], [
            'listing_rating' => 'Điểm tin đăng',
            'landlord_rating' => 'Điểm chủ nhà',
            'comment' => 'Bình luận',
        ]);

        // ERD §4: only students who already have a conversation may review.
        // 403 with the contract's specific message (API_CONTRACT §4).
        $hasConversation = $listing->conversations()
            ->where('student_id', $user->id)
            ->exists();

        if (! $hasConversation) {
            abort(403, 'Bạn cần nhắn tin với chủ nhà trước khi đánh giá.');
        }

        // One review per student per listing (unique constraint, ERD §3).
        $alreadyReviewed = Review::query()
            ->where('listing_id', $listing->id)
            ->where('student_id', $user->id)
            ->exists();

        if ($alreadyReviewed) {
            throw ValidationException::withMessages([
                'listing_id' => ['Bạn đã đánh giá tin này rồi.'],
            ]);
        }

        $review = Review::create([
            'listing_id' => $listing->id,
            'student_id' => $user->id,
            ...$data,
        ]);

        return response()->json(['data' => (new ReviewResource($review->load('student')))->resolve($request)], 201);
    }
}
