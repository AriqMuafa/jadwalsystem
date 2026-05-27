<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MediaController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240', Rule::mimes(['jpg', 'jpeg', 'png', 'webp', 'pdf'])],
        ]);

        $file = $data['file'];
        $storedPath = $file->store('attachments', 'public');

        $task->media()->create([
            'file_path' => $storedPath,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        return redirect()->back();
    }
}
