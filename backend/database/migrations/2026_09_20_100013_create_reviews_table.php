<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng reviews theo ERD 3.12.
 * Mỗi lần thuê có tối đa một đánh giá gồm 3 phần (nhà, chủ nhà, khu vực).
 * FK: tenancy_id UNIQUE (1 lần thuê - 1 đánh giá).
 * CHECK các rating từ 1 đến 5.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();

            $table->foreignId('tenancy_id')
                  ->unique()
                  ->constrained('tenancies')
                  ->restrictOnDelete();

            $table->foreignId('reviewer_id')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->foreignId('listing_id')
                  ->constrained('listings')
                  ->restrictOnDelete();

            $table->foreignId('landlord_id')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->foreignId('district_id')
                  ->constrained('districts')
                  ->restrictOnDelete();

            $table->smallInteger('listing_rating');   // CHECK 1-5
            $table->text('listing_comment')->nullable();

            $table->smallInteger('landlord_rating');  // CHECK 1-5
            $table->text('landlord_comment')->nullable();

            $table->smallInteger('area_rating');      // CHECK 1-5
            $table->text('area_comment')->nullable();

            $table->text('landlord_reply')->nullable();
            $table->timestampTz('landlord_replied_at')->nullable();

            $table->boolean('is_hidden')->default(false);
            $table->timestampsTz();

            $table->index('reviewer_id');
            $table->index('listing_id');
            $table->index('landlord_id');
            $table->index('district_id');
        });

        // CHECK constraints: tất cả rating từ 1 đến 5
        DB::statement(
            'ALTER TABLE reviews ADD CONSTRAINT chk_reviews_listing_rating '
            . 'CHECK (listing_rating BETWEEN 1 AND 5);'
        );
        DB::statement(
            'ALTER TABLE reviews ADD CONSTRAINT chk_reviews_landlord_rating '
            . 'CHECK (landlord_rating BETWEEN 1 AND 5);'
        );
        DB::statement(
            'ALTER TABLE reviews ADD CONSTRAINT chk_reviews_area_rating '
            . 'CHECK (area_rating BETWEEN 1 AND 5);'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
