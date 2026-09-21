<?php

namespace App\Http\Controllers;

use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Messaging (API_CONTRACT §4 - "Nhắn tin"). One conversation per (student,
 * listing) pair. Outsiders receive 404, not 403.
 */
class ConversationController extends Controller
{
    /** Attachment validation per contract: pdf, jpg, png, docx, max 5 MB. */
    private const ATTACHMENT_MIMES = 'pdf,jpg,jpeg,png,docx';

    private const ATTACHMENT_MAX_KB = 5120;

    /**
     * POST /api/conversations (Student) - get-or-create. Calling twice for
     * the same listing returns the existing conversation (contract).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'listing_id' => ['required', 'integer', 'exists:listings,id'],
        ], [
            'listing_id.required' => ':attribute là bắt buộc.',
            'listing_id.exists' => ':attribute không tồn tại.',
        ], [
            'listing_id' => 'Tin đăng',
        ]);

        /** @var User $student */
        $student = $request->user();
        $listing = Listing::findOrFail($validated['listing_id']);

        // A student cannot start a conversation about their own listing -
        // they are both sides of the same conversation otherwise.
        if ($listing->user_id === $student->id) {
            throw new AuthorizationException;
        }

        $conversation = Conversation::firstOrCreate(
            ['listing_id' => $listing->id, 'student_id' => $student->id],
            ['landlord_id' => $listing->user_id],
        );

        // Fresh read so the response matches the stored state.
        return response()->json([
            'data' => (new ConversationResource(
                $conversation->fresh(['listing.coverImage', 'student', 'landlord', 'lastMessage'])
            ))->resolve($request),
        ], $conversation->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * GET /api/conversations (User) - newest activity first, no pagination
     * (contract). unread_count counts messages from the OTHER user that are
     * not read yet. One query with correlated aggregates (no N+1).
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $conversations = Conversation::query()
            ->whereIn('id', $user->studentConversations()->select('id')
                ->unionAll($user->landlordConversations()->select('id')))
            ->with(['listing.coverImage', 'student', 'landlord', 'lastMessage'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at'),
            ])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'data' => ConversationResource::collection($conversations)->resolve($request),
        ]);
    }

    /**
     * GET /api/conversations/{id}/messages (Participant) - oldest first,
     * `after_id` returns only newer messages for cheap polling.
     */
    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        $validated = $request->validate([
            'after_id' => ['nullable', 'integer', 'min:0'],
        ], [
            'after_id.integer' => ':attribute phải là số nguyên.',
            'after_id.min' => ':attribute phải lớn hơn hoặc bằng 0.',
        ], [
            'after_id' => 'after_id',
        ]);

        $query = $conversation->messages()
            ->with('sender:id')
            ->orderBy('id')
            ->limit(500);

        if (isset($validated['after_id'])) {
            $query->where('id', '>', (int) $validated['after_id']);
        }

        $messages = $query->get();

        return response()->json([
            'data' => MessageResource::collection($messages)->resolve($request),
        ]);
    }

    /**
     * POST /api/conversations/{id}/messages (Participant) - JSON { body } or
     * multipart (body + file: pdf/jpg/png/docx, max 5 MB).
     */
    public function sendMessage(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        $isMultipart = $request->hasFile('file');

        $validated = $request->validate(
            $isMultipart ? [
                'body' => ['nullable', 'string', 'max:1000'],
                'file' => ['required', 'file', 'mimes:'.self::ATTACHMENT_MIMES, 'max:'.self::ATTACHMENT_MAX_KB],
            ] : [
                'body' => ['required', 'string', 'max:1000'],
            ],
            [
                'body.required' => 'Nội dung tin nhắn là bắt buộc.',
                'body.max' => 'Nội dung tin nhắn tối đa 1000 ký tự.',
                'file.required' => 'Tệp đính kèm là bắt buộc.',
                'file.mimes' => 'Tệp phải là pdf, jpg, png hoặc docx.',
                'file.max' => 'Tệp tối đa 5 MB.',
            ],
            [
                'body' => 'Nội dung tin nhắn',
                'file' => 'Tệp đính kèm',
            ],
        );

        $attachmentPath = null;
        $attachmentName = null;

        if ($isMultipart) {
            // Files are PRIVATE (local disk): served only through signed URLs.
            $uploaded = $request->file('file');
            $attachmentName = $uploaded->getClientOriginalName();
            $attachmentPath = $uploaded->store("attachments/{$conversation->id}");
        }

        $message = $conversation->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $validated['body'] ?? '',
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
        ]);

        // Touch so GET /conversations sorts by latest activity.
        $conversation->touch();

        return response()->json([
            'data' => (new MessageResource($message->load('sender:id')))->resolve($request),
        ], 201);
    }

    /**
     * POST /api/conversations/{id}/read (Participant) - mark the OTHER
     * user's messages as read, return null data.
     */
    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorizeParticipant($request, $conversation);

        Message::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['data' => null]);
    }

    /**
     * Participant check - anyone else gets 404 (contract: "Người ngoài
     * nhận 404"), never 403 which would leak existence.
     */
    private function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        $user = $request->user();

        if ($conversation->student_id !== $user->id && $conversation->landlord_id !== $user->id) {
            abort(404);
        }
    }
}
