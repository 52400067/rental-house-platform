<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves private chat attachments through temporary signed URLs
 * (MessageResource generates them, 60 minutes validity). No token needed -
 * the signature IS the authorization. Invalid/expired signatures get the
 * framework's 403 page (browser context, not the JSON API).
 */
class AttachmentController extends Controller
{
    public function show(Message $message): StreamedResponse
    {
        abort_unless($message->attachment_path !== null, 404);

        // "Thu hồi" (unsend) thay tombstone cho cả hai phía - file không còn
        // được tải nữa. URL ký cấp trước đó vẫn hợp lệ về mặt ký số tới 60
        // phút, nên sink phải tự re-check hàng (phòng thủ sâu bên trên việc
        // MessageResource đã null attachment_url cho tin đã thu hồi).
        abort_if($message->isUnsent(), 404);

        // response() = inline disposition so PDFs/images open straight in a
        // browser tab (contract: "Mở thẳng trong tab trình duyệt").
        // download() would force a save dialog instead.
        return Storage::disk('local')->response($message->attachment_path, $message->attachment_name);
    }
}
