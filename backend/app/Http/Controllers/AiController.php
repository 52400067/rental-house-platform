<?php

namespace App\Http\Controllers;

use App\Models\Amenity;
use App\Models\Listing;
use App\Models\School;
use App\Models\User;
use App\Models\Ward;
use App\Services\AiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * AI proxy endpoints (API_CONTRACT §4 "AI", docs/AI_CONTRACT.md).
 * Backend prepares ALL data (the AI service has no database) and never
 * sends names, emails or phone numbers to it.
 */
class AiController extends Controller
{
    public function __construct(private readonly AiClient $ai) {}

    /**
     * POST /api/ai/roommates (Student). Profile must be complete and
     * looking_for_roommate must be true, otherwise 422. Candidates: other
     * students with looking_for_roommate = true and intersecting budgets,
     * max 20. Response rows get name/school/phone re-attached by Backend.
     */
    public function roommates(Request $request): JsonResponse
    {
        /** @var User $me */
        $me = $request->user();

        if (! $this->profileComplete($me)) {
            return response()->json([
                'message' => 'Hãy hoàn thiện hồ sơ và bật tìm bạn cùng phòng.',
                'errors' => ['profile' => ['Hãy hoàn thiện hồ sơ và bật tìm bạn cùng phòng.']],
            ], 422);
        }

        $candidates = User::query()
            ->where('role', User::ROLE_STUDENT)
            ->where('looking_for_roommate', true)
            ->where('id', '!=', $me->id)
            ->where('budget_min', '<=', $me->budget_max)
            ->where('budget_max', '>=', $me->budget_min)
            ->with('school:id,name')
            ->limit(20)
            ->get();

        // The requester comes from the auth guard without eager loads.
        $me->load('school:id,name');

        if ($candidates->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $response = $this->ai->post('/roommates', [
            'requester' => $this->candidatePayload($me),
            'candidates' => $candidates->map(fn (User $u) => $this->candidatePayload($u))->all(),
            'limit' => 5,
        ], ['results']);

        // Keep only ids that are actually in the candidate set (contract §4),
        // cap at 5 and re-attach the personal fields Backend owns.
        $byId = $candidates->keyBy('id');
        $results = [];
        foreach ($response['results'] as $row) {
            $candidate = $byId->get($row['id'] ?? null);
            if ($candidate === null || count($results) >= 5) {
                continue;
            }

            $results[] = [
                'user_id' => $candidate->id,
                'name' => $candidate->name,
                'school' => $candidate->school?->name,
                'phone' => $candidate->phone,
                'score' => is_numeric($row['score'] ?? null) ? (int) $row['score'] : 0,
                'reason' => is_string($row['reason'] ?? null) ? $row['reason'] : '',
            ];
        }

        return response()->json(['data' => $results]);
    }

    /**
     * POST /api/ai/price-advice (Student). Comparable listings: same
     * ward + type, area within 40%, available or rented, excluding the
     * listing itself. Backend computes stats; count < 3 → 422.
     */
    public function priceAdvice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'listing_id' => ['required', 'integer', 'exists:listings,id'],
        ], [
            'listing_id.required' => 'Tin đăng là bắt buộc.',
            'listing_id.exists' => 'Tin đăng không tồn tại.',
        ], [
            'listing_id' => 'Tin đăng',
        ]);

        /** @var Listing $listing */
        $listing = Listing::query()
            ->visible()
            ->with(['amenities', 'ward'])
            ->findOrFail($validated['listing_id']);

        $minArea = (float) $listing->area_m2 * 0.6;
        $maxArea = (float) $listing->area_m2 * 1.4;

        $comparables = Listing::query()
            ->visible()
            ->where('id', '!=', $listing->id)
            ->where('ward_id', $listing->ward_id)
            ->where('type', $listing->type)
            ->whereBetween('area_m2', [$minArea, $maxArea])
            ->pluck('price')
            ->all();

        if (count($comparables) < 3) {
            return response()->json([
                'message' => 'Chưa đủ tin tương tự để so sánh giá.',
                'errors' => ['listing_id' => ['Chưa đủ tin tương tự để so sánh giá.']],
            ], 422);
        }

        sort($comparables);
        $count = count($comparables);
        $stats = [
            'count' => $count,
            'min' => (int) $comparables[0],
            'median' => (int) round($this->median($comparables)),
            'max' => (int) $comparables[$count - 1],
        ];

        $response = $this->ai->post('/price-advice', [
            'listing' => [
                'type' => $listing->type,
                'price' => (int) $listing->price,
                'area_m2' => (float) $listing->area_m2,
                'ward' => $listing->ward?->name,
                'amenities' => $listing->amenities->pluck('name')->values()->all(),
            ],
            'stats' => $stats,
        ], ['verdict', 'fair_min', 'fair_max', 'tips', 'message']);

        return response()->json(['data' => [
            'listing_price' => (int) $listing->price,
            'verdict' => $response['verdict'],
            'fair_min' => (int) $response['fair_min'],
            'fair_max' => (int) $response['fair_max'],
            'tips' => array_values(array_filter((array) $response['tips'], 'is_string')),
            'message' => $response['message'],
            'stats' => $stats,
        ]]);
    }

    /**
     * POST /api/ai/area-suggestions (Student). Budget/school fall back to
     * the profile. Per-ward stats computed in PHP; AI ranks and returns
     * reasons; Backend re-attaches names and stats.
     */
    public function areaSuggestions(Request $request): JsonResponse
    {
        /** @var User $me */
        $me = $request->user();

        $validated = $request->validate([
            'budget_min' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'budget_max' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'school_id' => ['sometimes', 'nullable', 'integer', 'exists:schools,id'],
            'priorities' => ['sometimes', 'nullable', 'array'],
            'priorities.*' => [Rule::in(['cheap', 'near_school', 'well_rated', 'many_options'])],
        ], [
            'priorities.*' => 'Giá trị ưu tiên không hợp lệ.',
            'school_id.exists' => 'Trường không tồn tại.',
        ], [
            'budget_min' => 'Ngân sách tối thiểu',
            'budget_max' => 'Ngân sách tối đa',
            'school_id' => 'Trường',
            'priorities' => 'Ưu tiên',
        ]);

        $budgetMin = $validated['budget_min'] ?? $me->budget_min;
        $budgetMax = $validated['budget_max'] ?? $me->budget_max;
        $schoolId = $validated['school_id'] ?? $me->school_id;

        if ($budgetMin === null && $budgetMax === null) {
            return response()->json([
                'message' => 'Hãy cung cấp ngân sách hoặc hoàn thiện hồ sơ.',
                'errors' => ['budget_min' => ['Hãy cung cấp ngân sách hoặc hoàn thiện hồ sơ.']],
            ], 422);
        }

        $budgetMin ??= 0;
        $budgetMax ??= PHP_INT_MAX;

        $school = $schoolId !== null ? School::find($schoolId) : null;

        $wards = Ward::query()
            ->whereHas('listings', fn ($q) => $q->visible()
                ->whereBetween('price', [$budgetMin, $budgetMax]))
            ->with(['listings' => fn ($q) => $q->visible()
                ->whereBetween('price', [$budgetMin, $budgetMax])
                ->withAvg('reviews', 'listing_rating')])
            ->get();

        $areas = $wards->map(function (Ward $ward) use ($school) {
            $listings = $ward->listings;
            $prices = $listings->pluck('price')->map(fn ($p) => (float) $p)->sort()->values();
            $ratings = $listings->pluck('reviews_avg_listing_rating')->filter()->map(fn ($r) => (float) $r);

            return [
                'ward_id' => $ward->id,
                'name' => $ward->name,
                'listings_count' => $listings->count(),
                'avg_price' => $prices->isEmpty() ? null : (int) round($prices->avg()),
                'avg_rating' => $ratings->isEmpty() ? null : round($ratings->avg(), 1),
                'distance_to_school_km' => $school !== null && $ward->latitude !== null
                    ? $this->haversineKm($school->latitude, $school->longitude, $ward->latitude, $ward->longitude)
                    : null,
            ];
        })->values()->all();

        if ($areas === []) {
            return response()->json(['data' => []]);
        }

        $response = $this->ai->post('/areas', [
            'preferences' => [
                'budget_min' => (int) $budgetMin,
                'budget_max' => (int) $budgetMax,
                'priorities' => $validated['priorities'] ?? [],
            ],
            // Names go through: ward names are not personal data and the
            // AI contract includes them in the request (docs/AI_CONTRACT §4).
            'areas' => $areas,
            'limit' => 3,
        ], ['results']);

        // Re-attach name + stats for the wards the AI kept.
        $byId = collect($areas)->keyBy('ward_id');
        $results = [];
        foreach ($response['results'] as $row) {
            $area = $byId->get($row['ward_id'] ?? null);
            if ($area === null || count($results) >= 3) {
                continue;
            }

            $results[] = [
                'ward_id' => $area['ward_id'],
                'name' => $area['name'],
                'reason' => is_string($row['reason'] ?? null) ? $row['reason'] : '',
                'stats' => [
                    'listings_count' => $area['listings_count'],
                    'avg_price' => $area['avg_price'],
                    'avg_rating' => $area['avg_rating'],
                    'distance_to_school_km' => $area['distance_to_school_km'],
                ],
            ];
        }

        return response()->json(['data' => $results]);
    }

    /**
     * POST /api/ai/chat (any authenticated user). Optional listing context.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:1000'],
            'history' => ['sometimes', 'nullable', 'array', 'max:10'],
            'history.*.role' => [Rule::in(['user', 'assistant'])],
            'history.*.content' => ['required', 'string'],
            'listing_id' => ['sometimes', 'nullable', 'integer', 'exists:listings,id'],
        ], [
            'message.required' => 'Tin nhắn là bắt buộc.',
            'message.max' => 'Tin nhắn tối đa 1000 ký tự.',
            'history.max' => 'Lịch sử tối đa 10 lượt.',
            'history.*.role' => 'Vai trò trong lịch sử chỉ là user hoặc assistant.',
            'listing_id.exists' => 'Tin đăng không tồn tại.',
        ], [
            'message' => 'Tin nhắn',
            'history' => 'Lịch sử',
            'listing_id' => 'Tin đăng',
        ]);

        $listingPayload = null;
        if (! empty($validated['listing_id'])) {
            $listing = Listing::query()
                ->visible()
                ->with(['amenities', 'ward'])
                ->find($validated['listing_id']);

            if ($listing !== null) {
                $listingPayload = [
                    'title' => $listing->title,
                    'price' => (int) $listing->price,
                    'area_m2' => (float) $listing->area_m2,
                    'address' => $listing->address,
                    'ward' => $listing->ward?->name,
                    'amenities' => $listing->amenities->pluck('name')->values()->all(),
                    'description' => $listing->description,
                ];
            }
        }

        $response = $this->ai->post('/chat', [
            'message' => $validated['message'],
            'history' => array_map(
                fn (array $turn) => ['role' => $turn['role'], 'content' => $turn['content']],
                array_slice($validated['history'] ?? [], -10),
            ),
            'listing' => $listingPayload,
        ], ['reply']);

        return response()->json(['data' => ['reply' => $response['reply']]]);
    }

    /**
     * POST /api/ai/description (Landlord). ids become names; missing title
     * becomes "Nhà cho thuê".
     */
    public function description(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'nullable', 'string', 'max:200'],
            'type' => ['sometimes', 'nullable', Rule::in(['room', 'apartment', 'house'])],
            'price' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'area_m2' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ward_id' => ['sometimes', 'nullable', 'integer', 'exists:wards,id'],
            'amenity_ids' => ['sometimes', 'nullable', 'array'],
            'amenity_ids.*' => ['integer', 'exists:amenities,id'],
        ], [
            'type' => 'Loại nhà không hợp lệ.',
            'ward_id.exists' => 'Quận không tồn tại.',
            'amenity_ids.*.exists' => 'Tiện ích không tồn tại.',
        ], [
            'title' => 'Tiêu đề',
            'type' => 'Loại nhà',
            'price' => 'Giá thuê',
            'area_m2' => 'Diện tích',
            'address' => 'Địa chỉ',
            'ward_id' => 'Quận',
            'amenity_ids' => 'Tiện ích',
        ]);

        $ward = isset($validated['ward_id'])
            ? Ward::find($validated['ward_id'])?->name
            : null;
        $amenities = isset($validated['amenity_ids'])
            ? Amenity::whereIn('id', $validated['amenity_ids'])->pluck('name')->values()->all()
            : null;

        $response = $this->ai->post('/description', [
            'title' => $validated['title'] ?? 'Nhà cho thuê',
            'type' => $validated['type'] ?? null,
            'price' => $validated['price'] ?? null,
            'area_m2' => $validated['area_m2'] ?? null,
            'address' => $validated['address'] ?? null,
            'ward' => $ward,
            'amenities' => $amenities,
        ], ['description']);

        return response()->json(['data' => ['description' => $response['description']]]);
    }

    // ------------------------------------------------------------------

    /** The AI contract profile shape - no name, email or phone here. */
    private function candidatePayload(User $user): array
    {
        return [
            'id' => $user->id,
            'budget_min' => (int) $user->budget_min,
            'budget_max' => (int) $user->budget_max,
            'sleep_schedule' => $user->sleep_schedule,
            'cleanliness' => $user->cleanliness !== null ? (int) $user->cleanliness : null,
            'smoking' => (bool) $user->smoking,
            'personality' => $user->personality,
            'interests' => $user->interests !== null
                ? array_values(array_filter(array_map('trim', explode(',', $user->interests))))
                : [],
        ];
    }

    private function profileComplete(User $user): bool
    {
        return $user->school_id !== null
            && $user->budget_min !== null
            && $user->budget_max !== null
            && $user->sleep_schedule !== null
            && $user->cleanliness !== null
            && $user->smoking !== null
            && $user->personality !== null
            && $user->looking_for_roommate === true;
    }

    /** @param  list<int|float>  $values  sorted ascending */
    private function median(array $values): float
    {
        $count = count($values);
        $middle = intdiv($count, 2);

        return $count % 2 === 1
            ? (float) $values[$middle]
            : ($values[$middle - 1] + $values[$middle]) / 2;
    }

    private function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return round($earthRadius * 2 * asin(min(1.0, sqrt($a))), 2);
    }
}
