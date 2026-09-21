<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\LandlordListingController;
use App\Http\Controllers\ListingController;
use App\Http\Controllers\ReferenceController;
use Illuminate\Support\Facades\Route;

// Authentication and profile (API_CONTRACT §4 - "Xác thực và hồ sơ").
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle.api:10,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');
Route::put('/profile', [ProfileController::class, 'update'])->middleware('auth:sanctum');

// Reference data (API_CONTRACT §4 - "Dữ liệu tham chiếu").
Route::get('/wards', [ReferenceController::class, 'wards']);
Route::get('/schools', [ReferenceController::class, 'schools']);
Route::get('/amenities', [ReferenceController::class, 'amenities']);

// Listing browse (API_CONTRACT §4 - "Duyệt tin đăng").
Route::get('/listings', [ListingController::class, 'index']);
Route::get('/listings/{listing}', [ListingController::class, 'show'])->whereNumber('listing');
Route::get('/listings/{listing}/reviews', [ListingController::class, 'reviews'])->whereNumber('listing');

// Reviews (API_CONTRACT §4 - "Đánh giá", Student only).
Route::post('/listings/{listing}/reviews', [ListingController::class, 'storeReview'])
    ->middleware(['auth:sanctum', 'role:student'])
    ->whereNumber('listing');

// Landlord listing management (API_CONTRACT §4 - "Chủ nhà: quản lý tin đăng").
Route::get('/my/listings', [LandlordListingController::class, 'index'])->middleware(['auth:sanctum', 'role:landlord']);
Route::post('/listings', [LandlordListingController::class, 'store'])->middleware(['auth:sanctum', 'role:landlord']);
Route::put('/listings/{listing}', [LandlordListingController::class, 'update'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber('listing');
Route::delete('/listings/{listing}', [LandlordListingController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber('listing');
Route::post('/listings/{listing}/images', [LandlordListingController::class, 'uploadImages'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber('listing');
Route::delete('/listings/{listing}/images/{image}', [LandlordListingController::class, 'deleteImage'])
    ->middleware(['auth:sanctum', 'role:landlord'])->whereNumber(['listing', 'image']);

// Favorites (API_CONTRACT §4 - "Yêu thích", Student only).
Route::get('/favorites', [FavoriteController::class, 'index'])->middleware(['auth:sanctum', 'role:student']);
Route::put('/favorites/{listing_id}', [FavoriteController::class, 'attach'])
    ->middleware(['auth:sanctum', 'role:student'])->whereNumber('listing_id');
Route::delete('/favorites/{listing_id}', [FavoriteController::class, 'detach'])
    ->middleware(['auth:sanctum', 'role:student'])->whereNumber('listing_id');

// Messaging (API_CONTRACT §4 - "Nhắn tin"). Outsiders get 404.
Route::post('/conversations', [ConversationController::class, 'store'])->middleware(['auth:sanctum', 'role:student']);
Route::get('/conversations', [ConversationController::class, 'index'])->middleware('auth:sanctum');
Route::get('/conversations/{conversation}/messages', [ConversationController::class, 'messages'])
    ->middleware('auth:sanctum')->whereNumber('conversation');
Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'sendMessage'])
    ->middleware('auth:sanctum')->whereNumber('conversation');
Route::post('/conversations/{conversation}/read', [ConversationController::class, 'markRead'])
    ->middleware('auth:sanctum')->whereNumber('conversation');

// AI proxy (API_CONTRACT §4 - "AI", docs/AI_CONTRACT.md).
// All endpoints: auth + 10 req/min per user; 503 when the AI service is down.
Route::middleware(['auth:sanctum', 'throttle.api:10,1'])->group(function () {
    Route::post('/ai/roommates', [AiController::class, 'roommates'])->middleware('role:student');
    Route::post('/ai/price-advice', [AiController::class, 'priceAdvice'])->middleware('role:student');
    Route::post('/ai/area-suggestions', [AiController::class, 'areaSuggestions'])->middleware('role:student');
    Route::post('/ai/chat', [AiController::class, 'chat']);
    Route::post('/ai/description', [AiController::class, 'description'])->middleware('role:landlord');
});
