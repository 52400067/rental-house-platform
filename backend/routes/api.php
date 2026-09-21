<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\ReferenceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Authentication and profile (API_CONTRACT §4 — "Xác thực và hồ sơ").
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle.api:10,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
Route::put('/profile', [ProfileController::class, 'update'])->middleware('auth:sanctum');

// Reference data (API_CONTRACT §4 — "Dữ liệu tham chiếu").
Route::get('/districts', [ReferenceController::class, 'districts']);
Route::get('/schools', [ReferenceController::class, 'schools']);
Route::get('/amenities', [ReferenceController::class, 'amenities']);

// Listing browse (API_CONTRACT §4 — "Duyệt tin đăng").
Route::get('/listings', [ListingController::class, 'index']);
