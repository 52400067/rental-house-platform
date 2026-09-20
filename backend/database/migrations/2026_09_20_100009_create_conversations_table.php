<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng conversations theo ERD 3.9.
 * Hội thoại giữa sinh viên và chủ nhà về một tin đăng.
 * Unique (listing_id, student_id) - chỉ 1 hội thoại cho mỗi cặp (sinh viên, tin).
 * FK: listing_id ON DELETE CASCADE, student_id/landlord_id ON DELETE CASCADE.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('listing_id')
                  ->constrained('listings')
                  ->cascadeOnDelete();

            $table->foreignId('student_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('landlord_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->timestampTz('last_message_at')->nullable()->index();
            $table->timestampTz('student_last_read_at')->nullable();
            $table->timestampTz('landlord_last_read_at')->nullable();
            $table->timestampsTz();

            $table->unique(['listing_id', 'student_id']);
            $table->index('listing_id');
            $table->index('student_id');
            $table->index('landlord_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
