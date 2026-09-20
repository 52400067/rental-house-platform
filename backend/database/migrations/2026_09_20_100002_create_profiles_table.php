<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng profiles theo ERD 3.2.
 * Quan hệ 1-1 với users. Cột dành riêng cho từng vai trò sẽ null với vai trò kia.
 * FK: user_id -> users ON DELETE CASCADE, school_id -> schools ON DELETE SET NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->unique()
                  ->constrained('users')
                  ->cascadeOnDelete();

            // Thông tin chung
            $table->text('bio')->nullable();
            $table->string('gender', 20)->nullable();        // male | female | other
            $table->date('date_of_birth')->nullable();

            // Sinh viên
            $table->foreignId('school_id')
                  ->nullable()
                  ->constrained('schools')
                  ->nullOnDelete();
            $table->smallInteger('year_of_study')->nullable();  // 1-8
            $table->unsignedBigInteger('budget_min')->nullable();
            $table->unsignedBigInteger('budget_max')->nullable();
            $table->jsonb('preferred_district_ids')->default('[]');
            $table->jsonb('lifestyle')->default('{}');
            $table->jsonb('interests')->default('[]');
            $table->boolean('matching_opt_in')->default(false);
            $table->string('roommate_gender_preference', 20)->default('any');  // any | same_gender

            // Chủ nhà
            $table->string('contact_note', 500)->nullable();
            $table->decimal('avg_rating', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);

            // Chung
            $table->timestampTz('onboarding_completed_at')->nullable();
            $table->timestampsTz();

            $table->index('school_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
