<?php

namespace App\Http\Resources;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Conversation object per API_CONTRACT §3: listing summary (id, title,
 * cover_image), other_user, last_message and unread_count for the viewer.
 */
class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Conversation $conversation */
        $conversation = $this->resource;

        $viewer = $request->user();
        $other = $conversation->student_id === $viewer->id
            ? $conversation->landlord
            : $conversation->student;

        $cover = $conversation->listing?->coverImage->first();

        return [
            'id' => $conversation->id,
            'listing' => $conversation->listing ? [
                'id' => $conversation->listing->id,
                'title' => $conversation->listing->title,
                'cover_image' => $cover ? Storage::disk('public')->url($cover->path) : null,
            ] : null,
            'other_user' => $other ? [
                'id' => $other->id,
                'name' => $other->name,
                'role' => $other->role, // student => link tới hồ sơ công khai
            ] : null,
            'last_message' => $conversation->lastMessage ? [
                'body' => $conversation->lastMessage->body,
                'created_at' => $conversation->lastMessage->created_at->toISOString(),
            ] : null,
            'unread_count' => (int) ($conversation->unread_count ?? 0),
        ];
    }
}
