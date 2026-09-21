<?php

namespace App\Http\Controllers;

use App\Http\Resources\DistrictResource;
use App\Http\Resources\SchoolResource;
use App\Models\Amenity;
use App\Models\District;
use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Reference data for dropdowns and the map (API_CONTRACT §4).
 */
class ReferenceController extends Controller
{
    /** GET /api/districts */
    public function districts(): AnonymousResourceCollection
    {
        return DistrictResource::collection(District::orderBy('name')->get());
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
