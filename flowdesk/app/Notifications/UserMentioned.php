<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class UserMentioned extends Notification
{
    use Queueable;

    public function __construct(
        protected Task $task,
        protected Comment $comment,
        protected ?User $actor = null
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'comment_id' => $this->comment->id,
            'actor_id' => $this->actor?->id,
            'message' => $this->actor
                ? "{$this->actor->name} mentioned you on a task."
                : 'You were mentioned on a task.',
        ];
    }
}
