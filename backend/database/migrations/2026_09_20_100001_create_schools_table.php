<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tạo bảng schools theo ERD 3.4.
 * FK: district_id -> districts ON DELETE RESTRICT.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schools', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('short_name', 50)->nullable();
            $table->string('address', 300)->nullable();
            $table->foreignId('district_id')
                  ->constrained('districts')
                  ->restrictOnDelete();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->timestampsTz();

            $table->index('district_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schools');
    }
};
