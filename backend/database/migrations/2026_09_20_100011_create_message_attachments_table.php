<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng message_attachments theo ERD 3.10.1.
 * Tệp đính kèm trong tin nhắn, lưu ở disk riêng tư.
 * FK: message_id -> messages ON DELETE CASCADE.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_attachments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('message_id')
                  ->constrained('messages')
                  ->cascadeOnDelete();

            $table->string('disk', 30)->default('private');
            $table->string('path', 500);
            $table->string('original_name', 255);
            $table->string('mime_type', 100);       // MIME thực, kiểm tra từ nội dung tệp
            $table->unsignedBigInteger('size_bytes');
            $table->timestampTz('created_at');

            $table->index('message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_attachments');
    }
};
