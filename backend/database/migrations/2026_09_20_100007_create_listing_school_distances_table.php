<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng listing_school_distances theo ERD 3.7.
 * Lưu khoảng cách đường chim bay (Haversine) từ tin đến các trường trong bán kính 15km.
 * PK kép (listing_id, school_id).
 * FK: listing_id ON DELETE CASCADE, school_id ON DELETE CASCADE.
 * Index (school_id, distance_km) cho lọc max_distance_km và sort.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listing_school_distances', function (Blueprint $table) {
            $table->foreignId('listing_id')
                  ->constrained('listings')
                  ->cascadeOnDelete();

            $table->foreignId('school_id')
                  ->constrained('schools')
                  ->cascadeOnDelete();

            $table->decimal('distance_km', 6, 2);

            $table->primary(['listing_id', 'school_id']);
            $table->index(['school_id', 'distance_km']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_school_distances');
    }
};
