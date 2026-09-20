<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng amenities theo ERD 3.6.
 * Bảng tham chiếu tiện ích. code là giá trị FE/AI dùng.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('amenities', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();    // ví dụ: wifi, air_conditioner
            $table->string('name', 100);             // Tên hiển thị tiếng Việt
            $table->string('icon', 50)->nullable();  // Tên icon phía FE
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amenities');
    }
};
