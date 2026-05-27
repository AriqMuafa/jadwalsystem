<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use Illuminate\Http\Request;

class WorkspaceController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $workspace = Workspace::create([
            'owner_id' => $request->user()->id,
            'name' => $data['name'],
        ]);

        $workspace->users()->attach($request->user()->id, ['role' => 'owner']);
        $request->session()->put('active_workspace_id', $workspace->id);
        $request->user()->forceFill(['last_workspace_id' => $workspace->id])->save();

        return redirect()->route('dashboard');
    }

    public function joinByCode(Request $request)
    {
        $data = $request->validate([
            'join_code' => ['required', 'string', 'max:20'],
        ]);

        $code = strtoupper(preg_replace('/\s+/', '', $data['join_code']));
        $workspace = Workspace::where('join_code', $code)->first();

        if (!$workspace) {
            return back()->withErrors([
                'join_code' => 'Kode workspace tidak ditemukan.',
            ]);
        }

        $workspace->users()->syncWithoutDetaching([
            $request->user()->id => ['role' => 'member'],
        ]);

        $request->session()->put('active_workspace_id', $workspace->id);
        $request->user()->forceFill(['last_workspace_id' => $workspace->id])->save();

        return redirect()->route('dashboard');
    }

    public function switchWorkspace(Request $request, Workspace $workspace)
    {
        abort_unless($request->user()->workspaces()->where('workspaces.id', $workspace->id)->exists(), 403);

        $request->session()->put('active_workspace_id', $workspace->id);
        $request->user()->forceFill(['last_workspace_id' => $workspace->id])->save();

        return redirect()->route('dashboard');
    }

    public function invite(Request $request, Workspace $workspace)
    {
        abort_unless($workspace->owner_id === $request->user()->id, 403);

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        WorkspaceInvitation::updateOrCreate(
            [
                'workspace_id' => $workspace->id,
                'email' => strtolower($data['email']),
                'status' => 'pending',
            ],
            [
                'invited_by' => $request->user()->id,
            ]
        );

        return back();
    }

    public function acceptInvitation(Request $request, WorkspaceInvitation $invitation)
    {
        abort_unless($invitation->email === $request->user()->email && $invitation->status === 'pending', 403);

        $invitation->workspace->users()->syncWithoutDetaching([
            $request->user()->id => ['role' => 'member'],
        ]);

        $invitation->update([
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        $request->session()->put('active_workspace_id', $invitation->workspace_id);
        $request->user()->forceFill(['last_workspace_id' => $invitation->workspace_id])->save();

        return redirect()->route('dashboard');
    }
}
