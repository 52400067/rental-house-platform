<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng listings theo ERD 3.5.
 * FK: landlord_id -> users ON DELETE RESTRICT, district_id -> districts ON DELETE RESTRICT.
 * Có soft delete, index phức hợp và GIN trigram cho title, address_line.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('landlord_id')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('description_source', 20)->default('manual');  // manual | ai_draft

            $table->string('property_type', 30)->index();     // room|apartment|house|shared_room
            $table->string('status', 20)->default('draft')->index();   // draft|published|rented|hidden

            $table->unsignedBigInteger('price_monthly');
            $table->unsignedBigInteger('deposit_amount')->nullable();
            $table->unsignedInteger('electricity_price')->nullable();
            $table->unsignedInteger('water_price')->nullable();

            $table->decimal('area_m2', 6, 1);        // 5 đến 1000
            $table->smallInteger('max_occupants')->default(1);

            $table->date('available_from')->nullable();

            $table->string('address_line', 300);

            $table->foreignId('district_id')
                  ->constrained('districts')
                  ->restrictOnDelete();

            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);

            $table->decimal('avg_rating', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->unsignedInteger('favorites_count')->default(0);
            $table->unsignedInteger('views_count')->default(0);

            $table->timestampTz('published_at')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            // Index phức hợp theo ERD 3.5
            $table->index(['status', 'price_monthly']);
            $table->index(['status', 'district_id']);
            $table->index(['latitude', 'longitude']);
            $table->index(['landlord_id', 'status']);
        });

        // CHECK constraint: price_monthly từ 100000 đến 100000000
        DB::statement(
            'ALTER TABLE listings ADD CONSTRAINT chk_listings_price_monthly '
            . 'CHECK (price_monthly BETWEEN 100000 AND 100000000);'
        );

        // GIN trigram index cho tìm kiếm tiêu đề (theo ERD 3.5 mục 5)
        DB::statement(
            'CREATE INDEX listings_title_trgm ON listings USING gin (title gin_trgm_ops);'
        );

        // GIN trigram index cho tìm kiếm địa chỉ (theo ERD 3.5 mục 5)
        DB::statement(
            'CREATE INDEX listings_address_line_trgm ON listings USING gin (address_line gin_trgm_ops);'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
