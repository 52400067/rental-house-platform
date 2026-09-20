<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng tenancies theo ERD 3.11.
 * Ghi nhận việc thuê - điều kiện cần để được đánh giá.
 * FK: listing_id ON DELETE RESTRICT, student_id ON DELETE RESTRICT, landlord_id ON DELETE RESTRICT.
 * Partial unique index: chỉ 1 bản ghi (listing_id, student_id) ở trạng thái pending/confirmed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenancies', function (Blueprint $table) {
            $table->id();

            $table->foreignId('listing_id')
                  ->constrained('listings')
                  ->restrictOnDelete();

            $table->foreignId('student_id')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->foreignId('landlord_id')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->string('status', 20)->default('pending')->index(); // pending|confirmed|ended|cancelled

            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->timestampTz('confirmed_at')->nullable();
            $table->timestampsTz();

            $table->index('listing_id');
            $table->index('student_id');
            $table->index('landlord_id');
        });

        // Partial unique index: chỉ 1 bản ghi active cho mỗi cặp (listing_id, student_id)
        DB::statement(
            "CREATE UNIQUE INDEX tenancies_active_unique "
            . "ON tenancies (listing_id, student_id) "
            . "WHERE status IN ('pending','confirmed');"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('tenancies');
    }
};
