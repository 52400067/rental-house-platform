<?php

namespace App\Http\Controllers;

use App\Events\MessageDeleted;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Facebook-style message deletion (API_CONTRACT §4 extension):
 *  - Sender, chưa hết 1 giờ: DELETE với scope=unsent - "Thu hồi" cho cả
 *    hai phía, body bị thay bằng tombstone "Tin nhắn đã được thu hồi".
 *  - Bất kỳ participant nào: scope=self - ẩn tin với chính mình, bên kia
 *    vẫn thấy bình thường.
 */
class MessageDeletionController extends Controller
{
    /** Cửa sổ thu hồi của Messenger: 1 giờ sau khi gửi. */
    private const UNSEND_WINDOW_MINUTES = 60;

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $user = $request->user();

        // Outsiders nhận 404 - giống các endpoint hội thoại khác.
        $conversation = Conversation::find($message->conversation_id);
        if (! $conversation
            || ($conversation->student_id !== $user->id
                && $conversation->landlord_id !== $user->id)) {
            abort(404);
        }

        $scope = $request->string('scope', 'self')->toString();

        if ($scope === 'unsent') {
            if ($message->sender_id !== $user->id) {
                return response()->json([
                    'message' => 'Chỉ người gửi mới thu hồi được tin nhắn.',
                ], 403);
            }
            if ($message->isUnsent()) {
                return response()->json(['data' => null]); // idempotent
            }
            if ($message->created_at->lt(now()->subMinutes(self::UNSEND_WINDOW_MINUTES))) {
                return response()->json([
                    'message' => 'Đã quá thời gian cho phép thu hồi tin nhắn.',
                ], 422);
            }

            $message->deleted_at = now();
            $message->deleted_for_user_ids = null;
            $message->save();

            broadcast(new MessageDeleted($message, true, []));

            return response()->json(['data' => null]);
        }

        // scope=self: hidden only for this viewer; idempotent per user.
        $hidden = $message->deleted_for_user_ids ?? [];
        if (! in_array($user->id, $hidden, true)) {
            $hidden[] = $user->id;
            $message->deleted_for_user_ids = $hidden;
            $message->save();

            // Local effect only - other clients must not hide it, so the
            // payload marks the caller as the sole "deleted_for" recipient.
            broadcast(new MessageDeleted($message, false, [$user->id]));
        }

        return response()->json(['data' => null]);
    }
}
