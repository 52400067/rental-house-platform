<?php

namespace App\Http\Controllers;

use App\Events\MessageReacted;
use App\Http\Requests\ReactionUpdateRequest;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Messenger-style reactions: PUT để đặt/đổi emoji của mình trên một tin
 * (map { user_id: emoji }), DELETE để bỏ. Mỗi user MỘT reaction - gọi PUT
 * lần nữa với cùng emoji là bỏ (idempotent cho nút toggle).
 */
class MessageReactionController extends Controller
{
    public function update(ReactionUpdateRequest $request, Message $message): JsonResponse
    {
        $user = $request->user();

        $conversation = Conversation::find($message->conversation_id);
        if (! $conversation
            || ($conversation->student_id !== $user->id
                && $conversation->landlord_id !== $user->id)) {
            abort(404);
        }

        $validated = $request->validated();

        $reactions = $message->reactions ?? [];
        $mine = (string) $user->id;

        if (($reactions[$mine] ?? null) === $validated['emoji']) {
            unset($reactions[$mine]); // toggle: cùng emoji lần nữa = bỏ
        } else {
            $reactions[$mine] = $validated['emoji']; // đặt / đổi
        }

        $message->reactions = $reactions;
        $message->save();

        broadcast(new MessageReacted($message, $user->id));

        return response()->json(['data' => ['reactions' => $reactions]]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $user = $request->user();

        $conversation = Conversation::find($message->conversation_id);
        if (! $conversation
            || ($conversation->student_id !== $user->id
                && $conversation->landlord_id !== $user->id)) {
            abort(404);
        }

        $reactions = $message->reactions ?? [];
        unset($reactions[(string) $user->id]);
        $message->reactions = $reactions;
        $message->save();

        broadcast(new MessageReacted($message, $user->id));

        return response()->json(['data' => ['reactions' => $reactions]]);
    }
}
