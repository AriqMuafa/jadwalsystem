<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Task;

class TaskObserver
{
    /**
     * Handle the Task "created" event.
     */
    public function created(Task $task): void
    {
        ActivityLog::create([
            'task_id' => $task->id,
            'user_id' => auth()->id() ?? $task->user_id,
            'action' => 'created',
            'description' => "Task created: {$task->title}",
        ]);
    }

    /**
     * Handle the Task "updated" event.
     */
    public function updated(Task $task): void
    {
        if ($task->wasChanged('column_status')) {
            $from = $task->getOriginal('column_status');
            $to = $task->column_status;

            ActivityLog::create([
                'task_id' => $task->id,
                'user_id' => auth()->id() ?? $task->user_id,
                'action' => 'moved',
                'description' => "Task moved from {$from} to {$to}",
            ]);

            return;
        }

        $trackedFields = ['title', 'category', 'priority', 'due_date'];
        if (collect($trackedFields)->contains(fn ($field) => $task->wasChanged($field))) {
            ActivityLog::create([
                'task_id' => $task->id,
                'user_id' => auth()->id() ?? $task->user_id,
                'action' => 'updated',
                'description' => "Task updated: {$task->title}",
            ]);
        }
    }

    /**
     * Handle the Task "deleting" event.
     */
    public function deleting(Task $task): void
    {
        ActivityLog::create([
            'task_id' => $task->id,
            'user_id' => auth()->id() ?? $task->user_id,
            'action' => 'deleted',
            'description' => "Task deleted: {$task->title}",
        ]);
    }

    /**
     * Handle the Task "deleted" event.
     */
    public function deleted(Task $task): void
    {
        //
    }

    /**
     * Handle the Task "restored" event.
     */
    public function restored(Task $task): void
    {
        //
    }

    /**
     * Handle the Task "force deleted" event.
     */
    public function forceDeleted(Task $task): void
    {
        //
    }
}
