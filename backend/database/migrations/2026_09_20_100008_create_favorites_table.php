<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng favorites theo ERD 3.8.
 * FK: user_id -> users ON DELETE CASCADE, listing_id -> listings ON DELETE CASCADE.
 * Unique (user_id, listing_id). Index (user_id, created_at DESC).
 * Chỉ có created_at, không có updated_at.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('favorites', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('listing_id')
                  ->constrained('listings')
                  ->cascadeOnDelete();

            $table->timestampTz('created_at');

            $table->unique(['user_id', 'listing_id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorites');
    }
};
