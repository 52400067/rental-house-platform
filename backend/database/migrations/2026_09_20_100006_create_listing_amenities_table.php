<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng listing_amenities theo ERD 3.6.1 (bảng nối nhiều-nhiều).
 * PK kép (listing_id, amenity_id).
 * FK: listing_id -> listings ON DELETE CASCADE, amenity_id -> amenities ON DELETE CASCADE.
 * Thêm index ngược (amenity_id, listing_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listing_amenities', function (Blueprint $table) {
            // Khóa chính kép
            $table->foreignId('listing_id')
                  ->constrained('listings')
                  ->cascadeOnDelete();

            $table->foreignId('amenity_id')
                  ->constrained('amenities')
                  ->cascadeOnDelete();

            $table->primary(['listing_id', 'amenity_id']);

            // Index ngược để query theo amenity_id
            $table->index(['amenity_id', 'listing_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_amenities');
    }
};
