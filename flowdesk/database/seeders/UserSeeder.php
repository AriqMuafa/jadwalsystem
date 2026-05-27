<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Menggunakan firstOrCreate agar tidak terjadi error duplikat 
        // jika seeder dijalankan lebih dari satu kali.
        User::firstOrCreate(
            ['email' => 'admin@flowdesk.test'], // Cari berdasarkan email
            [
                'name' => 'Administrator',
                'password' => Hash::make('password123'), // Silakan ubah password sesuai keinginan
            ]
        );
    }
}