<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskMoved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $taskId;
    public $columnStatus;

    public function __construct($taskId, $columnStatus)
    {
        $this->taskId = $taskId;
        $this->columnStatus = $columnStatus;
    }

    public function broadcastOn(): array
    {
        // Menggunakan public channel untuk contoh ini
        return [
            new Channel('kanban-board'),
        ];
    }
}