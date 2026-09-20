<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng ai_jobs theo ERD 3.13.
 * PK là UUID (khác các bảng khác dùng bigint).
 * FK: user_id ON DELETE CASCADE, listing_id ON DELETE CASCADE (nullable).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('listing_id')
                  ->nullable()
                  ->constrained('listings')
                  ->cascadeOnDelete();

            $table->string('type', 40);        // listing_description
            $table->string('status', 20)->default('pending')->index(); // pending|processing|done|failed

            $table->jsonb('input')->default('{}');
            $table->jsonb('result')->nullable();

            $table->string('error_code', 50)->nullable();
            $table->string('error_message', 500)->nullable();

            $table->smallInteger('attempts')->default(0);

            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('finished_at')->nullable();
            $table->timestampsTz();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_jobs');
    }
};
