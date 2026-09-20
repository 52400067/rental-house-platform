<?php

declare(strict_types=1);

use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function (): void {
    // TODO: Remove this ping route at step 17 (production cleanup)
    Route::get('/ping', fn() => ApiResponse::success(data: ['status' => 'ok']));
});
