<?php

namespace App\Http\Middleware;

use App\Models\WorkspaceInvitation;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->user();
        $workspaces = collect();
        $activeWorkspace = null;
        $pendingInvitationCount = 0;

        if ($user) {
            $workspaces = $user->workspaces()->select('workspaces.id', 'workspaces.name', 'workspaces.owner_id', 'workspaces.join_code')->get();
            $workspaces->each(function ($workspace) use ($user) {
                $workspace->is_personal = $workspace->owner_id === $user->id
                    && $workspace->users()->count() === 1;
            });
            $activeWorkspace = $workspaces->firstWhere('id', $request->session()->get('active_workspace_id'))
                ?? $workspaces->firstWhere('id', $user->last_workspace_id)
                ?? $workspaces->first();
            $pendingInvitationCount = WorkspaceInvitation::where('email', $user->email)->where('status', 'pending')->count();
        }

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'workspaceContext' => [
                'active' => $activeWorkspace,
                'all' => $workspaces,
                'pendingInvitationCount' => $pendingInvitationCount,
            ],
        ];
    }
}
