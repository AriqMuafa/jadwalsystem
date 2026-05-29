<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement('ALTER TABLE activity_logs DROP FOREIGN KEY activity_logs_task_id_foreign');
        DB::statement('ALTER TABLE activity_logs MODIFY task_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE activity_logs DROP FOREIGN KEY activity_logs_task_id_foreign');
        DB::statement('DELETE FROM activity_logs WHERE task_id IS NULL');
        DB::statement('ALTER TABLE activity_logs MODIFY task_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_task_id_foreign FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE');
    }
};
