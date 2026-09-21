<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * PUT /api/profile — partial update. Student-only fields are silently
     * dropped when the requester is a landlord (API_CONTRACT §4).
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $rules = [
            'name' => ['sometimes', 'string', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];

        $studentOnly = [
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'budget_min' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:2100000000'],
            'budget_max' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:2100000000'],
            'sleep_schedule' => ['sometimes', 'nullable', Rule::in([
                User::SLEEP_EARLY, User::SLEEP_NORMAL, User::SLEEP_LATE,
            ])],
            'cleanliness' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
            'smoking' => ['sometimes', 'nullable', 'boolean'],
            'personality' => ['sometimes', 'nullable', Rule::in([
                User::PERSONALITY_INTROVERT, User::PERSONALITY_AMBIVERT, User::PERSONALITY_EXTROVERT,
            ])],
            'interests' => ['sometimes', 'nullable', 'string', 'max:255'],
            'looking_for_roommate' => ['sometimes', 'boolean'],
        ];

        if ($user->role === User::ROLE_STUDENT) {
            $rules = array_merge($rules, $studentOnly);
        }

        $data = $request->validate($rules);

        // Cross-field rule: budget_max >= budget_min (combined with the
        // persisted values, because updates are partial).
        $this->validateBudgetRange($request, $user);

        $user->update($data);

        return response()->json(['data' => new UserResource($user->fresh())]);
    }

    /**
     * budget_max >= budget_min considering both the request payload and the
     * other half already stored on the user (partial updates).
     */
    private function validateBudgetRange(Request $request, User $user): void
    {
        $min = $request->input('budget_min', $user->budget_min);
        $max = $request->input('budget_max', $user->budget_max);

        if ($min !== null && $max !== null && (int) $max < (int) $min) {
            throw ValidationException::withMessages([
                'budget_max' => ['Ngân sách tối đa phải lớn hơn hoặc bằng ngân sách tối thiểu.'],
            ]);
        }
    }
}
