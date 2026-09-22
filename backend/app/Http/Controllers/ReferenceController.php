<?php

namespace App\Http\Controllers;

use App\Http\Resources\CityResource;
use App\Http\Resources\SchoolResource;
use App\Http\Resources\WardResource;
use App\Models\Amenity;
use App\Models\City;
use App\Models\School;
use App\Models\Ward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Reference data for dropdowns and the map (API_CONTRACT §4).
 * Cascade: City -> Ward/School qua tham số city_id tùy chọn.
 */
class ReferenceController extends Controller
{
    /** GET /api/cities - 34 đơn vị hành chính cấp tỉnh, xếp theo tên A-Z. */
    public function cities(): AnonymousResourceCollection
    {
        return CityResource::collection(
            City::orderBy('name')->get()
        );
    }

    /** GET /api/wards?city_id= - optional city filter. */
    public function wards(Request $request): AnonymousResourceCollection
    {
        $wards = Ward::query()
            ->with('city')
            ->when(
                $request->filled('city_id'),
                fn ($q) => $q->where('city_id', $request->integer('city_id'))
            )
            ->orderBy('name')
            ->get();

        return WardResource::collection($wards);
    }

    /** GET /api/schools?city_id= - optional city filter. */
    public function schools(Request $request): AnonymousResourceCollection
    {
        $schools = School::query()
            ->with('city')
            ->when(
                $request->filled('city_id'),
                fn ($q) => $q->where('city_id', $request->integer('city_id'))
            )
            ->orderBy('name')
            ->get();

        return SchoolResource::collection($schools);
    }

    /** GET /api/amenities */
    public function amenities(): JsonResponse
    {
        return response()->json([
            'data' => Amenity::orderBy('name')->get(['id', 'name']),
        ]);
    }
}
