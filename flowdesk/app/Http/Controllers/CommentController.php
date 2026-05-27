<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\User;
use App\Models\Task;
use App\Models\Workspace;
use App\Notifications\UserMentioned;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    private function activeWorkspace(Request $request): ?Workspace
    {
        $workspaceId = $request->session()->get('active_workspace_id');
        $workspace = $request->user()->workspaces()->where('workspaces.id', $workspaceId)->first()
            ?? $request->user()->workspaces()->where('workspaces.id', $request->user()->last_workspace_id)->first()
            ?? $request->user()->workspaces()->first();

        if (!$workspace) {
            $request->session()->forget('active_workspace_id');

            return null;
        }

        $request->session()->put('active_workspace_id', $workspace->id);
        $request->user()->forceFill(['last_workspace_id' => $workspace->id])->save();

        return $workspace;
    }

    // DIUBAH: Hapus ketergantungan pada Model Task di parameter fungsi
    public function store(Request $request)
    {
        $data = $request->validate([
            'body' => ['required', 'string'],
        ]);
        $workspace = $this->activeWorkspace($request);
        abort_unless($workspace, 422, 'Pilih atau buat workspace terlebih dahulu.');

        // Simpan komentar tanpa menyertakan task_id (global)
        $comment = Comment::create([
            'user_id' => auth()->id(),
            'workspace_id' => $workspace->id,
            'body' => $data['body'],
            'task_id' => null, // Eksplisit biarkan kosong
        ]);

        $formattedComment = [
            'id' => $comment->id,
            'user_id' => $comment->user_id,
            'user' => auth()->user()?->name ?? 'Unknown',
            'body' => $comment->body,
            'time' => $comment->created_at->format('H:i'),
        ];

        broadcast(new \App\Events\GlobalCommentPosted($formattedComment))->toOthers();

        // Logika Mention Username
        preg_match_all('/@([A-Za-z0-9_.]+)/', $data['body'], $matches);
        $usernames = array_values(array_unique($matches[1] ?? []));

        if (!empty($usernames)) {
            $mentioned = User::query()
                ->whereIn('name', $usernames)
                ->get();

            // Kita harus membuat model dummy Task agar struktur notifikasi tidak error
            // Atau Anda bisa mengubah notifikasi nanti agar tidak memerlukan Task
            $dummyTask = new Task(['id' => 0, 'title' => 'Global Chat']);

            foreach ($mentioned as $user) {
                $user->notify(new UserMentioned($dummyTask, $comment, auth()->user()));
            }
        }

        return redirect()->back();
    }

    public function storeGlobal(Request $request)
    {
        $data = $request->validate(['body' => 'required|string']);
        $workspace = $this->activeWorkspace($request);
        abort_unless($workspace, 422, 'Pilih atau buat workspace terlebih dahulu.');
        
        $comment = Comment::create([
            'user_id' => auth()->id(),
            'workspace_id' => $workspace->id,
            'body' => $data['body'],
        ]);

        // Format sama persis dengan format di TaskController@index
        $formattedComment = [
            'id' => $comment->id,
            'user_id' => $comment->user_id,
            'user' => $comment->user->name, // Jangan pakai 'Anda' di sini karena dikirim ke orang lain
            'body' => $comment->body,
            'time' => $comment->created_at->format('H:i'),
        ];

        broadcast(new \App\Events\GlobalCommentPosted($formattedComment))->toOthers();

        return redirect()->back();
    }
}
