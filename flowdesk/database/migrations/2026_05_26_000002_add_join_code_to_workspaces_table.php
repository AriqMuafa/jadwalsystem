<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->string('join_code', 12)->nullable()->unique()->after('name');
        });

        DB::table('workspaces')
            ->whereNull('join_code')
            ->orderBy('id')
            ->get(['id'])
            ->each(function ($workspace) {
                do {
                    $code = Str::upper(Str::random(8));
                } while (DB::table('workspaces')->where('join_code', $code)->exists());

                DB::table('workspaces')
                    ->where('id', $workspace->id)
                    ->update(['join_code' => $code]);
            });
    }

    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->dropUnique(['join_code']);
            $table->dropColumn('join_code');
        });
    }
};
