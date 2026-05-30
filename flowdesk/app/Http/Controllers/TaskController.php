<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Comment;
use App\Models\Workspace;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    private function activeWorkspace(Request $request): ?Workspace
    {
        $user = $request->user();
        $workspaceId = $request->session()->get('active_workspace_id');
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();

        if (!$workspace) {
            $workspace = $user->workspaces()->where('workspaces.id', $user->last_workspace_id)->first()
                ?? $user->workspaces()->first();
        }

        if (!$workspace) {
            $request->session()->forget('active_workspace_id');

            return null;
        }

        $request->session()->put('active_workspace_id', $workspace->id);
        $user->forceFill(['last_workspace_id' => $workspace->id])->save();

        Task::where('user_id', $user->id)
            ->whereNull('workspace_id')
            ->update(['workspace_id' => $workspace->id]);

        return $workspace;
    }

    private function canAccessTask(Task $task): bool
    {
        return $task->workspace_id
            ? auth()->user()->workspaces()->where('workspaces.id', $task->workspace_id)->exists()
            : $task->user_id === auth()->id();
    }

    public function index()
    {
        $workspace = $this->activeWorkspace(request());

        if (!$workspace) {
            return Inertia::render('WorkspaceSetup', [
                'currentUser' => auth()->user(),
            ]);
        }

        // Ambil semua tugas milik user
        $tasks = Task::with('user')
            ->where('workspace_id', $workspace->id)
            ->get();

        // Ambil riwayat obrolan global (yang tidak memiliki task_id), muat relasi user untuk nama pengirim
        $globalComments = Comment::with('user')
            ->whereNull('task_id')
            ->where('workspace_id', $workspace->id)
            ->orderBy('created_at', 'asc') // Urutkan dari yang terlama ke terbaru
            ->get();

        // Format komentar agar mudah dibaca oleh frontend Vue
        $formattedComments = $globalComments->map(function ($comment) {
            return [
                'id' => $comment->id,
                'user_id' => $comment->user_id,
                'user' => $comment->user?->name ?? 'Unknown',
                'is_own' => $comment->user_id === auth()->id(),
                'body' => $comment->body,
                'time' => $comment->created_at->format('H:i'), // Format jam (WIB)
            ];
        });

        // PERBAIKAN: Ubah 'Index' menjadi 'Dashboard' sesuai nama file Anda
        return Inertia::render('Dashboard', [
            'tasks' => $tasks,
            'globalComments' => $formattedComments,
            'currentUser' => auth()->user(), 
        ]);
    }

    // Pada fungsi store()
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string'],
            'priority' => ['required', 'string'],
            'column_status' => ['required', Rule::in(['pending', 'today', 'on_progress', 'done'])], 
            'tags' => ['nullable', 'array'],
            'time_spent' => ['nullable', 'integer'],
            'due_date' => ['nullable', 'date'],
            'attachment' => ['nullable', 'file', 'max:10240'],
        ]);

        $data['user_id'] = auth()->id();
        $workspace = $this->activeWorkspace($request);
        abort_unless($workspace, 422, 'Pilih atau buat workspace terlebih dahulu.');
        $data['workspace_id'] = $workspace->id;

        if (!empty($data['due_date']) && Carbon::parse($data['due_date'], 'Asia/Jakarta')->isSameDay(now('Asia/Jakarta'))) {
            $data['column_status'] = 'today';
        }

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            
            // Simpan file fisik
            $data['attachment_path'] = $file->store('task-attachments', 'public');
            
            // Simpan nama asli file untuk dibaca oleh task.file_name di frontend
            $data['file_name'] = $file->getClientOriginalName();
        }

        unset($data['attachment']);

        Task::create($data);

        return redirect()->back();
    }

    // Pada fungsi move()
    public function update(Request $request, Task $task)
    {
        abort_unless($this->canAccessTask($task), 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string'],
            'priority' => ['required', 'string'],
            'column_status' => ['required', Rule::in(['pending', 'today', 'on_progress', 'done'])],
            'tags' => ['nullable', 'array'],
            'time_spent' => ['nullable', 'integer'],
            'due_date' => ['nullable', 'date'],
        ]);

        $task->update($data);

        return redirect()->back();
    }

    // Pada fungsi move()
    public function move(Request $request, Task $task)
    {
        abort_unless($this->canAccessTask($task), 403);

        $data = $request->validate([
            'column_status' => ['required', \Illuminate\Validation\Rule::in(['pending', 'today', 'on_progress', 'done'])],
        ]);

        $task->update($data);

        broadcast(new \App\Events\TaskMoved($task->id, $data['column_status']))->toOthers();

        return redirect()->back();
    }

    public function destroy(Task $task)
    {
        abort_unless($this->canAccessTask($task), 403);

        $task->delete();

        return redirect()->back(); // <-- Ubah bagian ini
    }

    public function archive(Task $task)
    {
        abort_unless($this->canAccessTask($task), 403);

        $task->update(['archived_at' => now()]);

        return redirect()->back();
    }

    public function restore(Task $task)
    {
        abort_unless($this->canAccessTask($task), 403);

        $task->update(['archived_at' => null]);

        return redirect()->back();
    }

    public function logs(Task $task)
    {
        abort_unless($this->canAccessTask($task), 403);

        $limit = min(max((int) request('limit', 10), 1), 30);
        $offset = max((int) request('offset', 0), 0);

        $logs = DB::table('activity_logs')
            ->where('task_id', $task->id)
            ->orderBy('created_at', 'desc')
            ->offset($offset)
            ->limit($limit + 1)
            ->get();

        return response()->json([
            'logs' => $logs->take($limit)->values(),
            'has_more' => $logs->count() > $limit,
        ]);
    }

    public function attachment(Task $task)
    {
        abort_unless($this->canAccessTask($task), 403);
        abort_unless($task->attachment_path && Storage::disk('public')->exists($task->attachment_path), 404);

        return response()->file(Storage::disk('public')->path($task->attachment_path), [
            'Content-Disposition' => 'inline; filename="'.addslashes($task->file_name ?? basename($task->attachment_path)).'"',
        ]);
    }
}
