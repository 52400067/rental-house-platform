<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

/**
 * A new chat message was created. One private channel per conversation,
 * both participants subscribe - this is the bubble-delivery path that
 * replaces the 5s polling of GET /conversations/{id}/messages.
 *
 * ShouldBroadcastNow (no queue): bubble latency must not depend on the
 * database queue worker running in the demo stack.
 */
class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        // Conversation channel: the open thread. Per-user channels: the
        // sidebar list + unread badge (Navbar) re-render without polling.
        $conversation = $this->message->conversation;

        return [
            new PrivateChannel('conversation.'.$this->message->conversation_id),
            new PrivateChannel('App.Models.User.'.$conversation->student_id),
            new PrivateChannel('App.Models.User.'.$conversation->landlord_id),
        ];
    }

    /** Client listens with .listen('.message.sent', ...) on the private channel. */
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * Shape follows MessageResource (API_CONTRACT §3) EXCEPT `is_mine`:
     * the payload is shared by both recipients, so mine/not-mine is
     * derived on the client from sender_id. `seen_at` is always null on
     * delivery - the `.message.seen` event flips it later.
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->message->conversation_id,
            // Sidebar preview (Messenger): both parties receive this payload,
            // so last_message carries sender_id - each client derives
            // "Bạn: ..." prefix by comparing with its own user id.
            'conversation' => [
                'id' => $this->message->conversation_id,
                'last_message' => [
                    'sender_id' => $this->message->sender_id,
                    'body' => $this->message->body,
                    'attachment_name' => $this->message->attachment_name,
                    'created_at' => $this->message->created_at->toISOString(),
                ],
            ],
            'message' => [
                'id' => $this->message->id,
                'sender_id' => $this->message->sender_id,
                'body' => $this->message->body,
                'seen_at' => null,
                'attachment_name' => $this->message->attachment_name,
                'attachment_url' => $this->message->attachment_path
                    ? URL::temporarySignedRoute(
                        'attachments.show',
                        now()->addMinutes(60),
                        ['message' => $this->message->id],
                    )
                    : null,
                'created_at' => $this->message->created_at->toISOString(),
            ],
        ];
    }
}
