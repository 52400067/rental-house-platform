<?php

namespace App\Http\Controllers;

use App\Http\Resources\SchoolResource;
use App\Http\Resources\WardResource;
use App\Models\Amenity;
use App\Models\School;
use App\Models\Ward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Reference data for dropdowns and the map (API_CONTRACT §4).
 */
class ReferenceController extends Controller
{
    /** GET /api/wards */
    public function wards(): AnonymousResourceCollection
    {
        return WardResource::collection(Ward::orderBy('name')->get());
    }

    /** GET /api/schools */
    public function schools(): AnonymousResourceCollection
    {
        return SchoolResource::collection(School::orderBy('name')->get());
    }

    /** GET /api/amenities */
    public function amenities(): JsonResponse
    {
        return response()->json([
            'data' => Amenity::orderBy('name')->get(['id', 'name']),
        ]);
    }
}
