<?php

namespace App\Http\Controllers;

use App\Models\WorkspaceInvitation;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function show()
    {
        $user = auth()->user();

        return Inertia::render('Profile', [
            'profileUser' => $user,
            'workspaces' => $user->workspaces()->with('owner')->get(),
            'pendingInvitations' => WorkspaceInvitation::with(['workspace', 'inviter'])
                ->where('email', $user->email)
                ->where('status', 'pending')
                ->latest()
                ->get(),
        ]);
    }
}
