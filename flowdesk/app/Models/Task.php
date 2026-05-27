<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'workspace_id',
        'title',
        'category',
        'priority',
        'column_status',
        'tags',
        'time_spent',
        'due_date',
        'attachment_path',
        'file_name', // <-- PASTIKAN BARIS INI DITAMBAHKAN
    ];

    protected $casts = [
        'tags' => 'array',
        'due_date' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function media(): MorphMany
    {
        return $this->morphMany(Media::class, 'mediable');
    }
}
