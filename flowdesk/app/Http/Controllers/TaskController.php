<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index()
    {
        return Inertia::render('Dashboard', [
            'tasks' => Task::query()->latest()->get(),
        ]);
    }

    // Pada fungsi store()
    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string'],
            'priority' => ['required', 'string'],
            // Tambahkan 'on_progress' di bawah ini
            'column_status' => ['required', Rule::in(['pending', 'today', 'on_progress', 'done'])], 
            'tags' => ['nullable', 'array'],
            'time_spent' => ['integer'],
            'due_date' => ['nullable', 'date'],
        ]);

        Task::create($data);

        return redirect()->back();
    }

    // Pada fungsi move()
    public function move(Request $request, Task $task)
    {
        $data = $request->validate([
            // Tambahkan 'on_progress' di bawah ini
            'column_status' => ['required', Rule::in(['pending', 'today', 'on_progress', 'done'])],
        ]);

        $task->update($data);

        return redirect()->back();
    }

    public function destroy(Task $task)
    {
        $task->delete();

        return redirect()->back(); // <-- Ubah bagian ini
    }
}
