<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            
            // Relasi ke tabel users (Otomatis hapus tugas jika user dihapus)
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            
            // Data Utama Tugas
            $table->string('title');
            $table->string('category');
            $table->string('priority');
            $table->string('column_status');
            $table->json('tags')->nullable();
            
            // Time Tracking & Tenggat Waktu
            $table->integer('time_spent')->default(0);
            $table->timestamp('due_date')->nullable();
            
            // File Uploads
            $table->string('attachment_path')->nullable();
            $table->string('file_name')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};