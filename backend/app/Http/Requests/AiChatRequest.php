<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/ai/chat. Rules copied from the previous inline validation so
 * the 422 JSON is unchanged (API_CONTRACT §1).
 */
class AiChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // auth:sanctum on the route group
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:1', 'max:1000'],
            'history' => ['sometimes', 'nullable', 'array', 'max:10'],
            'history.*.role' => [Rule::in(['user', 'assistant'])],
            'history.*.content' => ['required', 'string'],
            'listing_id' => ['sometimes', 'nullable', 'integer', 'exists:listings,id'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'message.required' => 'Tin nhắn là bắt buộc.',
            'message.max' => 'Tin nhắn tối đa 1000 ký tự.',
            'history.max' => 'Lịch sử tối đa 10 lượt.',
            'history.*.role' => 'Vai trò trong lịch sử chỉ là user hoặc assistant.',
            'listing_id.exists' => 'Tin đăng không tồn tại.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'message' => 'Tin nhắn',
            'history' => 'Lịch sử',
            'listing_id' => 'Tin đăng',
        ];
    }
}
