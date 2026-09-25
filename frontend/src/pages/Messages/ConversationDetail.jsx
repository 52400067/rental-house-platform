import { useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getEcho } from "../../api/echo";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";
import { CONV_PREVIEW_EVENT } from "../../constants/events";
import { dayLabel } from "../../components/conversation/labels";
import ChatBubble from "../../components/conversation/ChatBubble";
import TypingIndicator from "../../components/conversation/TypingIndicator";
import SeenReceipt from "../../components/conversation/SeenReceipt";
import ChatComposer from "../../components/conversation/ChatComposer";
import MessageMenu from "../../components/conversation/MessageMenu";
import UnsendConfirmDialog from "../../components/conversation/UnsendConfirmDialog";
import { useConversationData } from "../../hooks/useConversationData";
import { useConversationRealtime } from "../../hooks/useConversationRealtime";
import { useConversationMessages } from "../../hooks/useConversationMessages";
import { useMessageMenu } from "../../hooks/useMessageMenu";
import { useStickToBottom } from "../../hooks/useStickToBottom";

export default function ConversationDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const toast = useToast();

    const {
        conversation,
        convLoaded,
        messages,
        setMessages,
        loaded,
        lastIdRef,
    } = useConversationData(id);

    // Sidebar preview (Messenger): thread là nguồn sự thật khi đang mở -
    // phát event để Messages.jsx cập nhật item tương ứng.
    // useCallback: useConversationRealtime effect dùng hàm này trong deps -
    // một hàm mới mỗi render sẽ leave/re-subscribe kênh Echo liên tục
    // (regression thật mà ws-check đã bắt).
    const dispatchPreview = useCallback(
        (msg) => {
            window.dispatchEvent(
                new CustomEvent(CONV_PREVIEW_EVENT, {
                    detail: {
                        conversation_id: Number(id),
                        last_message: {
                            sender_id: msg.sender_id,
                            body: msg.body,
                            attachment_name: msg.attachment_name,
                            created_at: msg.created_at,
                        },
                    },
                })
            );
        },
        [id]
    );

    const { otherTyping } = useConversationRealtime(
        id,
        setMessages,
        lastIdRef,
        dispatchPreview
    );

    const { send, remove, react, sending, error } = useConversationMessages(
        id,
        setMessages,
        lastIdRef
    );

    const { threadRef, handleScroll } = useStickToBottom(messages, loaded);
    const {
        menuFor,
        setMenuFor,
        menuUp,
        confirmUnsend,
        setConfirmUnsend,
        openMenuFor,
    } = useMessageMenu(threadRef);

    // Whisper "typing" qua kênh hội thoại (client-event, không qua backend).
    function whisperTyping() {
        const echo = getEcho();
        if (!echo) return;
        echo.private(`conversation.${id}`).whisper("typing", { user_id: user?.id });
    }

    async function handleSend(text, file) {
        const msg = await send(text, file);
        if (!msg) return false;
        // Gửi xong thì ngừng báo "đang soạn" ở phía người kia.
        whisperTyping();
        // Sidebar preview cho tin mình vừa gửi (HTTP response).
        dispatchPreview(msg);
        return true;
    }

    // Facebook-style: "Thu hồi" (cả hai phía, sender, trong 1h) hoặc
    // "Xóa chỉ ở phía mình". Cập nhật optimistic - WS event tới sau cũng
    // idempotent vì listener map/filter cùng hình thức.
    async function handleDelete(m, scope) {
        setMenuFor(null);
        setConfirmUnsend(null);
        const ok = await remove(m, scope);
        if (ok && scope === "self") toast.info("Bạn đã xóa tin nhắn ở phía mình.");
        if (!ok) toast.error("Không xóa được tin nhắn.");
    }

    // Messenger menu: "Copy text" giữ nguyên tin ở cả hai phía.
    function copyText(m) {
        navigator.clipboard?.writeText(m.body || "").catch(() => {});
        setMenuFor(null);
        toast.info("Đã sao chép văn bản.");
    }

    async function handleReact(m, emoji) {
        setMenuFor(null);
        const ok = await react(m, emoji, user?.id);
        if (!ok) toast.error("Không thả được cảm xúc.");
    }

    // Grouping + day separators. A bubble is "first"/"last" of its run when
    // the neighbor is across a day, a >15min gap, or a different sender.
    const rows = useMemo(() => {
        const out = [];
        for (let i = 0; i < messages.length; i++) {
            const m = messages[i];
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const mine = !!m.is_mine;
            const sameDayAs = (a, b) => dayLabel(a.created_at) === dayLabel(b.created_at);
            const far = (a, b) => new Date(b.created_at) - new Date(a.created_at) > 15 * 60 * 1000;
            const newDay = !prev || !sameDayAs(prev, m);
            const first = newDay || !prev || !!prev.is_mine !== mine || far(prev, m);
            const last =
                !next || !sameDayAs(next, m) || !!next.is_mine !== mine || far(m, next);
            out.push({ m, day: newDay ? dayLabel(m.created_at) : null, first, last });
        }
        return out;
    }, [messages]);

    const other = conversation?.other_user;
    const subject = conversation?.listing;

    // Route con của /messages — spinner lúc đang tải, empty-state nếu
    // hội thoại không tồn tại (vào thẳng URL lạ).
    if (!conversation) {
        return (
            <div className="chat-page chat-page-empty">
                {convLoaded ? (
                    <>
                        <i className="bi bi-chat-square-heart fs-1" style={{ color: "var(--ink)" }} />
                        <strong>Không tải được hội thoại</strong>
                    </>
                ) : (
                    <div className="spinner-border text-secondary" role="status" aria-label="Đang tải" />
                )}
            </div>
        );
    }

    return (
        <div className="chat-page">
            {/* Header */}
            <div className="chat-header mb-3">
                <Link
                    to="/messages"
                    className="btn btn-outline-secondary btn-sm chat-back"
                    aria-label="Quay lại danh sách tin nhắn"
                >
                    <i className="bi bi-arrow-left" />
                </Link>
                <div className="chat-avatar" aria-hidden="true">
                    {(other?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-grow-1 chat-header-text">
                    <strong className="d-block text-truncate">
                        {other?.role === "student" ? (
                            <Link
                                to={`/students/${other.id}`}
                                className="text-decoration-none text-reset"
                                title="Xem hồ sơ công khai"
                            >
                                {other.name || "Người dùng"}
                                <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: "0.7rem" }} />
                            </Link>
                        ) : (
                            other?.name || "Hội thoại"
                        )}
                    </strong>
                    {subject ? (
                        <Link
                            to={`/rooms/${subject.id}`}
                            className="chat-subject d-block text-decoration-none"
                            title={subject.title}
                        >
                            <i className="bi bi-house-door me-1" />
                            {subject.title}
                        </Link>
                    ) : (
                        <span className="chat-subject">Trò chuyện trực tiếp</span>
                    )}
                </div>
            </div>

            {/* Thread */}
            <div
                ref={threadRef}
                className="chat-thread"
                onScroll={handleScroll}
                aria-live="polite"
            >
                {!loaded ? (
                    <div className="chat-empty">
                        <div className="spinner-border text-secondary" role="status" aria-label="Đang tải tin nhắn" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="chat-empty">
                        <i className="bi bi-chat-square-heart fs-1" style={{ color: "var(--ink)" }} />
                        <strong className="mt-2">Chưa có tin nhắn nào</strong>
                        <span className="small">Hãy chào {other?.name || "người kia"} và hỏi về phòng.</span>
                    </div>
                ) : (
                    rows.map(({ m, day, first, last }) => (
                        <div key={m.id}>
                            {day && (
                                <div className="chat-day">
                                    <span>{day}</span>
                                </div>
                            )}
                            <div
                                className={`chat-row ${m.is_mine ? "mine" : ""} ${first ? "first" : ""} ${last ? "last" : ""}`}
                            >
                                <ChatBubble
                                    m={m}
                                    onBubbleClick={(el) => openMenuFor(m, el)}
                                >
                                    {/* Chip reaction bám mép bubble, nhóm theo
                                        emoji - Messenger-style. */}
                                    {Object.keys(m.reactions || {}).length > 0 && (
                                        <div className="chat-reactions">
                                            {Object.entries(
                                                Object.entries(m.reactions).reduce(
                                                    (acc, [, emoji]) => {
                                                        acc[emoji] = (acc[emoji] || 0) + 1;
                                                        return acc;
                                                    },
                                                    {}
                                                )
                                            ).map(([emoji, count]) => (
                                                <span key={emoji} className="chat-reaction-chip">
                                                    {emoji}
                                                    {count > 1 && <b>{count}</b>}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="chat-menu-btn"
                                        aria-label="Tùy chọn tin nhắn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openMenuFor(m, e.currentTarget);
                                        }}
                                    >
                                        <i className="bi bi-chevron-down" />
                                    </button>

                                    {/* Messenger web menu: nhỏ, neo vào bubble,
                                        mục tùy theo quyền trên tin này. */}
                                    {menuFor === m.id && (
                                        <MessageMenu
                                            m={m}
                                            myId={user?.id}
                                            up={menuUp}
                                            onReact={handleReact}
                                            onCopy={copyText}
                                            onDelete={handleDelete}
                                            onClose={() => setMenuFor(null)}
                                            onAskUnsend={(x) => {
                                                setMenuFor(null);
                                                setConfirmUnsend(x);
                                            }}
                                        />
                                    )}
                                </ChatBubble>
                            </div>
                        </div>
                    ))
                )}

                {/* Typing indicator: ba chấm nảy thay bubble của người kia. */}
                {otherTyping && <TypingIndicator />}

                {/* Dấu đã xem kiểu Messenger web: chip avatar nhỏ của người
                    đọc, dưới bubble mới nhất của mình (chỉ khi tin cuối là
                    của mình và đã được đọc). */}
                {(() => {
                    const lastMsg = messages[messages.length - 1];
                    if (otherTyping || !lastMsg?.is_mine || !lastMsg.seen_at) return null;
                    return <SeenReceipt name={other?.name} />;
                })()}
            </div>

            {error && <div className="chat-error">{error}</div>}

            {/* Composer */}
            <ChatComposer onSend={handleSend} sending={sending} onTyping={whisperTyping} />

            {/* Messenger-style confirm: hộp thoại nhỏ, chỉ nói hậu quả. */}
            {confirmUnsend && (
                <UnsendConfirmDialog
                    onCancel={() => setConfirmUnsend(null)}
                    onConfirm={() => handleDelete(confirmUnsend, "unsent")}
                />
            )}
        </div>
    );
}
