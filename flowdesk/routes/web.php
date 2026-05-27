<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Rute Publik (Hanya untuk tamu / yang belum login)
Route::middleware('guest')->group(function () {
    Route::get('/login', function () {
        return Inertia::render('Auth/Login');
    })->name('login');
    
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

// Rute Terlindungi (Wajib Login)
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Core Kanban Routes
    Route::get('/', [TaskController::class, 'index'])->name('dashboard');
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}/move', [TaskController::class, 'move']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    Route::get('/tasks/{task}/attachment', [TaskController::class, 'attachment'])->name('tasks.attachment');

    // Media & Comments (DIUBAH)
    Route::post('/tasks/{task}/media', [MediaController::class, 'store']);
    
    // Rute Global Chat (sudah dilepas dari task)
    Route::post('/comments/global', [CommentController::class, 'store']);

    Route::get('/tasks/{task}/logs', [App\Http\Controllers\TaskController::class, 'logs'])->name('tasks.logs');

    Route::get('/profile', [ProfileController::class, 'show'])->name('profile');
    Route::post('/workspaces', [WorkspaceController::class, 'store'])->name('workspaces.store');
    Route::post('/workspaces/join', [WorkspaceController::class, 'joinByCode'])->name('workspaces.join');
    Route::post('/workspaces/{workspace}/switch', [WorkspaceController::class, 'switchWorkspace'])->name('workspaces.switch');
    Route::post('/workspaces/{workspace}/invite', [WorkspaceController::class, 'invite'])->name('workspaces.invite');
    Route::post('/workspace-invitations/{invitation}/accept', [WorkspaceController::class, 'acceptInvitation'])->name('workspace-invitations.accept');
});
