<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng messages theo ERD 3.10.
 * id tự tăng đơn điệu, dùng làm con trỏ polling.
 * FK: conversation_id ON DELETE CASCADE, sender_id ON DELETE CASCADE.
 * Index (conversation_id, id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();

            $table->foreignId('conversation_id')
                  ->constrained('conversations')
                  ->cascadeOnDelete();

            $table->foreignId('sender_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->string('type', 20)->default('text');  // text | attachment | system
            $table->text('body')->nullable();              // null khi chỉ gửi tệp
            $table->timestampsTz();

            $table->index(['conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
