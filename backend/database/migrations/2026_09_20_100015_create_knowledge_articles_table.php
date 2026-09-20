<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng knowledge_articles theo ERD 3.14.
 * Nguồn tri thức (mẫu hợp đồng, FAQ, cẩm nang khu vực) cho chatbot.
 * Có GIN index tsvector cho tìm kiếm full-text (cấu hình 'simple' để hỗ trợ tiếng Việt).
 * FK: district_id -> districts ON DELETE SET NULL (dùng cho area_guide).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knowledge_articles', function (Blueprint $table) {
            $table->id();
            $table->string('category', 30)->index();  // contract | faq | area_guide
            $table->string('title', 200);
            $table->string('slug', 200)->unique();
            $table->text('content');
            $table->foreignId('district_id')
                  ->nullable()
                  ->constrained('districts')
                  ->nullOnDelete();
            $table->boolean('is_published')->default(true);
            $table->timestampsTz();
        });

        // GIN index tsvector với cấu hình 'simple' (không phụ thuộc ngôn ngữ, hỗ trợ tiếng Việt tốt hơn)
        // ERD 3.14: to_tsvector('simple', title || ' ' || content)
        DB::statement(
            "CREATE INDEX knowledge_articles_search_idx ON knowledge_articles "
            . "USING gin (to_tsvector('simple', title || ' ' || content));"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_articles');
    }
};
