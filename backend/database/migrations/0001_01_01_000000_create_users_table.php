<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Bước 1: Bật extension pg_trgm (bắt buộc theo ERD 3.14 & 3.5).
     * Bước 2: Tạo bảng users theo ERD 3.1 (sửa migration mặc định của Laravel).
     * Bước 3: Tạo bảng password_reset_tokens (mặc định Laravel, giữ lại).
     * Bảng sessions, cache, jobs bỏ (dùng Redis driver).
     */
    public function up(): void
    {
        // Bật extension pg_trgm cho PostgreSQL – cần để tạo GIN index trigram
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('email', 255)->unique();
            $table->timestampTz('email_verified_at')->nullable();
            $table->string('password', 255);
            $table->string('role', 20)->index();                     // student | landlord | admin
            $table->string('phone', 20)->nullable();
            $table->string('avatar_path', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestampsTz();
            $table->softDeletesTz();                                  // deleted_at
        });

        // CHECK constraint: role chỉ nhận 3 giá trị hợp lệ
        DB::statement(
            "ALTER TABLE users ADD CONSTRAINT chk_users_role "
            . "CHECK (role IN ('student','landlord','admin'));"
        );

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
        // Không drop extension vì các migration sau cũng cần pg_trgm
    }
};
