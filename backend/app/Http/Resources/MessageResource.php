<?php

namespace App\Http\Resources;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * Message object per API_CONTRACT §3. attachment_url is a temporary signed
 * URL (60 minutes) on the attachments route - opens directly in a browser
 * tab, no token needed. Both attachment fields are null without a file.
 */
class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Message $message */
        $message = $this->resource;

        return [
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'is_mine' => $message->sender_id === $request->user()->id,
            'body' => $message->body,
            'attachment_name' => $message->attachment_name,
            'attachment_url' => $message->attachment_path ? URL::temporarySignedRoute(
                'attachments.show',
                now()->addMinutes(60),
                ['message' => $message->id],
            ) : null,
            'created_at' => $message->created_at->toISOString(),
        ];
    }
}
