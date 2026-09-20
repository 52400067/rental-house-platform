<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng listing_images theo ERD 3.5.1.
 * FK: listing_id -> listings ON DELETE CASCADE.
 * Tối đa 10 ảnh mỗi tin (enforce ở tầng ứng dụng, không enforce ở DB).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listing_images', function (Blueprint $table) {
            $table->id();

            $table->foreignId('listing_id')
                  ->constrained('listings')
                  ->cascadeOnDelete();

            $table->string('path', 500);                     // Ảnh gốc đã nén
            $table->string('thumbnail_path', 500)->nullable(); // Tạo bằng job
            $table->smallInteger('sort_order')->default(0);
            $table->boolean('is_cover')->default(false);
            $table->timestampsTz();

            $table->index('listing_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_images');
    }
};
