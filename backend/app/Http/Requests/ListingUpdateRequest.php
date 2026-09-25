<?php

namespace App\Http\Requests;

use App\Models\Listing;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * PUT /api/listings/{id} (landlord) - partial update, may also change
 * status. Rules copied from the previous shared rules() block.
 */
class ListingUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // ownership check runs in the controller
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:5', 'max:200'],
            'type' => ['sometimes', Rule::in([
                Listing::TYPE_ROOM, Listing::TYPE_APARTMENT, Listing::TYPE_HOUSE,
            ])],
            'price' => ['sometimes', 'integer', 'between:100000,100000000'],
            'area_m2' => ['sometimes', 'numeric', 'between:5,1000'],
            'address' => ['sometimes', 'string', 'max:300'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'ward_id' => ['sometimes', 'integer', 'exists:wards,id'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'amenity_ids' => ['sometimes', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
            'status' => ['sometimes', Rule::in([
                Listing::STATUS_AVAILABLE, Listing::STATUS_RENTED, Listing::STATUS_HIDDEN,
            ])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
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

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'title' => 'Tiêu đề',
            'type' => 'Loại tin',
            'price' => 'Giá',
            'area_m2' => 'Diện tích',
            'address' => 'Địa chỉ',
            'latitude' => 'Vĩ độ',
            'longitude' => 'Kinh độ',
            'ward_id' => 'Quận',
            'description' => 'Mô tả',
            'amenity_ids' => 'Tiện ích',
            'amenity_ids.*' => 'Tiện ích',
            'status' => 'Trạng thái',
        ];
    }
}
