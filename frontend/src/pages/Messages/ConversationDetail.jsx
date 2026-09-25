import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getConversations,
    getMessages,
    sendMessage,
    markRead,
    deleteMessage,
    reactToMessage,
} from "../../api/socialApi";
import { errMessage } from "../../api/axiosClient";
import { getEcho } from "../../api/echo";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Toast";

const MAX_FILE = 5 * 1024 * 1024; // contract: 5 MB
const ALLOWED = /\.(pdf|jpe?g|png|docx)$/i;

/** "Hôm nay" / "Hôm qua" / dd/mm/yyyy for day separators. */
function dayLabel(iso) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, today)) return "Hôm nay";
    if (same(d, yesterday)) return "Hôm qua";
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** HH:mm, always absolute (poll-safe, no "x phút trước" drift). */
function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function ConversationDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const toast = useToast();

    const [conversation, setConversation] = useState(null);
    const [convLoaded, setConvLoaded] = useState(false);
    const [messages, setMessages] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [body, setBody] = useState("");
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [menuFor, setMenuFor] = useState(null); // tin nhắn đang mở menu tùy chọn
    const [menuUp, setMenuUp] = useState(false); // menu lật lên khi anchor gần đáy
    const [confirmUnsend, setConfirmUnsend] = useState(null); // tin chờ xác nhận thu hồi
    const [otherTyping, setOtherTyping] = useState(false); // "người kia đang soạn"

    const threadRef = useRef(null);
    const lastIdRef = useRef(0);
    const fileInputRef = useRef(null);
    const stickToBottom = useRef(true);
    const typingTimer = useRef(null);

    // Load conversation header (other user, listing).
    useEffect(() => {
        let active = true;
        setConvLoaded(false);
        getConversations()
            .then((list) => {
                if (active) setConversation(list.find((c) => String(c.id) === String(id)));
            })
            .catch(() => {})
            .finally(() => {
                if (active) setConvLoaded(true);
            });
        return () => {
            active = false;
        };
    }, [id]);

    // Initial load (polls replaced by the Reverb WebSocket subscription below).
    const load = useCallback(async () => {
        try {
            const rows = await getMessages(id);
            lastIdRef.current = rows.length ? rows[rows.length - 1].id : 0;
            setMessages(rows);
            markRead(id).catch(() => {});
        } catch {
            // transient - subscriber below is not affected
        } finally {
            setLoaded(true);
        }
    }, [id]);

    useEffect(() => {
        setMessages([]);
        setLoaded(false);
        lastIdRef.current = 0;
        load();
    }, [id, load]);

    // Realtime: bubbles arrive over the conversation channel. The WebSocket
    // IS the delivery path now (no 5s polling); Echo re-subscribes with the
    // React keys, cleanup runs on unmount / conversation switch.
    useEffect(() => {
        const echo = getEcho();
        if (!echo) return undefined;

        const privateChan = echo.private(`conversation.${id}`);
        const userChan = echo.private(`App.Models.User.${user?.id}`);

        privateChan.listen(".message.sent", (e) => {
            const msg = e.message;
            setOtherTyping(false); // tin đến = người kia ngừng soạn
            setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [
                    ...prev,
                    {
                        ...msg,
                        is_unsent: false,
                        is_mine: msg.sender_id === user?.id,
                        seen_at: null,
                    },
                ];
            });
            lastIdRef.current = Math.max(lastIdRef.current, msg.id);
            if (msg.sender_id !== user?.id) markRead(id).catch(() => {});
        });

        // Typing qua client-event (whisper) - không qua backend, gửi trực
        // tiếp giữa các subscriber của kênh hội thoại. Debounce 2.5s.
        privateChan.whisper("typing", { user_id: user?.id });
        privateChan.listenForWhisper("typing", (e) => {
            if (e.user_id === user?.id) return;
            setOtherTyping(true);
            clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setOtherTyping(false), 2500);
        });

        // Reaction: merge lại map reactions mới (đặt/đổi/bỏ của bất kỳ ai).
        privateChan.listen(".message.reacted", (e) => {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === e.message_id ? { ...m, reactions: e.reactions } : m
                )
            );
        });

        // Dấu đã xem: người kia markRead -> tất cả tin mine có seen_at.
        privateChan.listen(".message.seen", (e) => {
            if (e.reader_id === user?.id) return;
            setMessages((prev) =>
                prev.map((m) => (m.is_mine && !m.seen_at ? { ...m, seen_at: e.seen_at } : m))
            );
        });

        // Facebook-style deletion: "removed" = unsend cho cả hai phía
        // (thành tombstone); "removed: false" + deleted_for chứa mình =
        // ẩn tin (chỉ ảnh hưởng phía mình).
        privateChan.listen(".message.deleted", (e) => {
            const mine = user?.id;
            const affectsMe = e.removed
                || (e.deleted_for || []).includes(mine);
            if (!affectsMe) return;

            setMessages((prev) =>
                e.removed
                    ? prev.map((m) =>
                          m.id === e.message_id
                              ? { ...m, is_unsent: true, body: null, attachment_url: null, attachment_name: null }
                              : m
                      )
                    : prev.filter((m) => m.id !== e.message_id)
            );
        });

        userChan.listen(".message.sent", (e) => {
            if (e.message.conversation_id === Number(id)) {
                // Same conversation is open - the privateChan handler drew it;
                // keep the thread marked read so unread_count stays 0.
                markRead(id).catch(() => {});
            }
        });

        return () => {
            clearTimeout(typingTimer.current);
            echo.leave(`conversation.${id}`);
            echo.leave(`App.Models.User.${user?.id}`);
        };
    }, [id, user?.id]);

    // Autoscroll: follow only when the user is already at (or near) the bottom,
    // so reading history is not yanked down while new messages poll in.
    useEffect(() => {
        const el = threadRef.current;
        if (!el) return;
        const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (nearBottom) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, loaded]);

    function handleScroll() {
        const el = threadRef.current;
        if (!el) return;
        stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    }

    async function handleSubmit(e) {
        e?.preventDefault();
        const text = body.trim();
        if ((!text && !file) || sending) return;
        setError("");
        setSending(true);
        try {
            const msg = await sendMessage(id, { body: text, file });
            // The sender's own .message.sent WS event usually lands BEFORE this
            // HTTP response resolves - skip if the subscriber already drew it.
            setMessages((prev) =>
                prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
            // Gửi xong thì ngừng báo "đang soạn" ở phía người kia.
            privateWhisper();
            lastIdRef.current = Math.max(lastIdRef.current, msg.id);
            setBody("");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            toast.error(errMessage(err));
        } finally {
            setSending(false);
        }
    }

    function handleFileChange(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!ALLOWED.test(f.name)) {
            setError("Chỉ nhận tệp pdf, jpg, png hoặc docx.");
            e.target.value = "";
            return;
        }
        if (f.size > MAX_FILE) {
            setError("Tệp tối đa 5 MB.");
            e.target.value = "";
            return;
        }
        setError("");
        setFile(f);
    }

    // Đóng menu khi bấm ra ngoài; Esc đóng cả menu lẫn hộp thoại thu hồi.
    useEffect(() => {
        if (menuFor == null && !confirmUnsend) return undefined;
        const close = () => setMenuFor(null);
        const onKey = (e) => {
            if (e.key === "Escape") {
                setMenuFor(null);
                setConfirmUnsend(null);
            }
        };
        window.addEventListener("click", close);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("keydown", onKey);
        };
    }, [menuFor, confirmUnsend]);

    const canUnsend = (m) =>
        m.is_mine &&
        !m.is_unsent &&
        Date.now() - new Date(m.created_at).getTime() < 60 * 60 * 1000;

    // Whisper "typing" qua kênh hội thoại (client-event, không qua backend).
    function privateWhisper() {
        const echo = getEcho();
        if (!echo) return;
        echo.private(`conversation.${id}`).whisper("typing", { user_id: user?.id });
    }

    // Mở menu tùy chọn; lật lên trên nếu anchor nằm gần đáy thread để menu
    // không bao giờ bị cắt (bấm bubble hoặc nút chevron đều dùng hàm này).
    function openMenuFor(m, anchorEl) {
        if (menuFor === m.id) {
            setMenuFor(null);
            return;
        }
        const wrap = anchorEl.closest(".chat-bubble-wrap");
        const thread = threadRef.current;
        if (wrap && thread) {
            const wr = wrap.getBoundingClientRect();
            const tr = thread.getBoundingClientRect();
            const MENU_H = 110;
            setMenuUp(tr.bottom - wr.bottom < MENU_H);
        }
        setMenuFor(m.id);
    }

    // Facebook-style: "Thu hồi" (cả hai phía, sender, trong 1h) hoặc
    // "Xóa chỉ ở phía mình". Cập nhật optimistic - WS event tới sau cũng
    // idempotent vì listener map/filter cùng hình thức.
    async function handleDelete(m, scope) {
        setMenuFor(null);
        setConfirmUnsend(null);
        try {
            await deleteMessage(m.id, scope);
            setMessages((prev) =>
                scope === "unsent"
                    ? prev.map((x) =>
                          x.id === m.id
                              ? { ...x, is_unsent: true, body: null, attachment_url: null, attachment_name: null }
                              : x
                      )
                    : prev.filter((x) => x.id !== m.id)
            );
            if (scope === "self") toast.info("Bạn đã xóa tin nhắn ở phía mình.");
        } catch (err) {
            toast.error(errMessage(err));
        }
    }

    // Messenger menu: "Copy text" giữ nguyên tin ở cả hai phía.
    function copyText(m) {
        navigator.clipboard?.writeText(m.body || "").catch(() => {});
        setMenuFor(null);
        toast.info("Đã sao chép văn bản.");
    }

    // Reaction: PUT toggle (cùng emoji lần nữa = bỏ). Optimistic - WS event
    // .message.reacted cũng merge map mới nên client nào cũng đồng bộ.
    const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😠"];
    async function handleReact(m, emoji) {
        setMenuFor(null);
        const prevMap = m.reactions || {};
        const mine = String(user?.id);
        const optimistic = { ...prevMap };
        if (prevMap[mine] === emoji) delete optimistic[mine];
        else optimistic[mine] = emoji;
        setMessages((prev) =>
            prev.map((x) => (x.id === m.id ? { ...x, reactions: optimistic } : x))
        );
        try {
            const serverMap = await reactToMessage(m.id, emoji);
            setMessages((prev) =>
                prev.map((x) => (x.id === m.id ? { ...x, reactions: serverMap } : x))
            );
        } catch (err) {
            toast.error(errMessage(err));
            setMessages((prev) =>
                prev.map((x) => (x.id === m.id ? { ...x, reactions: prevMap } : x))
            );
        }
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
                                <div className="chat-bubble-wrap">
                                    {m.is_unsent ? (
                                        <div className="chat-bubble chat-bubble-unsent">
                                            <i className="bi bi-slash-circle me-1" />
                                            Tin nhắn đã được thu hồi
                                            <span className="chat-time">{timeLabel(m.created_at)}</span>
                                        </div>
                                    ) : (
                                        <div
                                            className="chat-bubble"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openMenuFor(m, e.currentTarget);
                                            }}
                                            title="Tùy chọn tin nhắn"
                                        >
                                            {m.body && <div>{m.body}</div>}
                                            {m.attachment_url && (
                                                <a
                                                    href={m.attachment_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="chat-attachment"
                                                >
                                                    <i className="bi bi-paperclip" />
                                                    {m.attachment_name}
                                                </a>
                                            )}
                                            <span className="chat-time">{timeLabel(m.created_at)}</span>
                                        </div>
                                    )}

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
                                        aria-label="Tùy chọn tin nhắn"                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openMenuFor(m, e.currentTarget);
                                        }}
                                    >
                                        <i className="bi bi-chevron-down" />
                                    </button>

                                    {/* Messenger web menu: nhỏ, neo vào bubble,
                                        mục tùy theo quyền trên tin này. */}
                                    {menuFor === m.id && (
                                        <div
                                            className={`chat-menu${menuUp ? " up" : ""}`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="chat-reaction-row">
                                                {REACTIONS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        className={`chat-reaction-emoji${
                                                            (m.reactions || {})[String(user?.id)] === emoji
                                                                ? " mine"
                                                                : ""
                                                        }`}
                                                        onClick={() => handleReact(m, emoji)}
                                                        aria-label={`Thả cảm xúc ${emoji}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="chat-menu-divider" />
                                            {m.body && (
                                                <button type="button" onClick={() => copyText(m)}>
                                                    <i className="bi bi-clipboard me-2" />
                                                    Copy văn bản
                                                </button>
                                            )}
                                            {canUnsend(m) && (
                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() => {
                                                        setMenuFor(null);
                                                        setConfirmUnsend(m);
                                                    }}
                                                >
                                                    <i className="bi bi-arrow-counterclockwise me-2" />
                                                    Thu hồi
                                                </button>
                                            )}
                                            <button type="button" onClick={() => handleDelete(m, "self")}>
                                                <i className="bi bi-trash3 me-2" />
                                                Xóa chỉ ở phía mình
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Typing indicator: ba chấm nảy thay bubble của người kia. */}
                {otherTyping && (
                    <div className="chat-row">
                        <div className="chat-bubble chat-typing" aria-label="Đang soạn tin nhắn">
                            <span className="chat-typing-dot" />
                            <span className="chat-typing-dot" />
                            <span className="chat-typing-dot" />
                        </div>
                    </div>
                )}

                {/* Dấu đã xem kiểu Messenger web: chip avatar nhỏ của người
                    đọc, dưới bubble mới nhất của mình (chỉ khi tin cuối là
                    của mình và đã được đọc). */}
                {(() => {
                    const lastMsg = messages[messages.length - 1];
                    if (otherTyping || !lastMsg?.is_mine || !lastMsg.seen_at) return null;
                    return (
                        <div
                            className="chat-seen"
                            title={`Đã xem bởi ${other?.name || "người kia"}`}
                            aria-label="Đã xem"
                        >
                            <span className="chat-seen-avatar">
                                {(other?.name || "?").charAt(0).toUpperCase()}
                            </span>
                        </div>
                    );
                })()}
            </div>

            {error && <div className="chat-error">{error}</div>}

            {/* Composer */}
            <form className="chat-composer" onSubmit={handleSubmit}>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="d-none"
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    title="Đính kèm tệp (pdf, jpg, png, docx - tối đa 5 MB)"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <i className="bi bi-paperclip" />
                </button>
                <textarea
                    className="form-control"
                    placeholder="Nhập tin nhắn..."
                    maxLength={1000}
                    rows={1}
                    value={body}
                    aria-label="Nhập tin nhắn"
                    onChange={(e) => {
                        setBody(e.target.value);
                        // Báo "đang soạn" cho mọi thay đổi (gõ, dán) - whisper
                        // client-event, receiver tự hết sau 2.5s không gõ tiếp.
                        privateWhisper();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />
                <button type="submit" className="btn btn-send" disabled={sending || (!body.trim() && !file)}>
                    {sending ? (
                        <span className="spinner-border spinner-border-sm" aria-label="Đang gửi" />
                    ) : (
                        <i className="bi bi-send-fill" />
                    )}
                </button>
            </form>

            {file && (
                <div className="chat-file-chip">
                    <i className="bi bi-file-earmark" />
                    <span className="text-truncate" style={{ maxWidth: 260 }}>
                        {file.name}
                    </span>
                    <button
                        type="button"
                        className="btn-close"
                        aria-label="Gỡ tệp đính kèm"
                        onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                    />
                </div>
            )}            {/* Messenger-style confirm: hộp thoại nhỏ, chỉ nói hậu quả. */}
            {confirmUnsend && (
                <div className="chat-sheet-overlay" onClick={() => setConfirmUnsend(null)}>
                    <div
                        className="chat-confirm"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Thu hồi tin nhắn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <strong>Thu hồi tin nhắn?</strong>
                        <p className="small mb-0">
                            Bạn sẽ gỡ vĩnh viễn tin nhắn này cho mọi người trong cuộc trò chuyện.
                        </p>
                        <div className="chat-confirm-actions">
                            <button
                                type="button"
                                className="chat-confirm-btn"
                                onClick={() => setConfirmUnsend(null)}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="chat-confirm-btn primary"
                                onClick={() => handleDelete(confirmUnsend, "unsent")}
                            >
                                Thu hồi
                            </button>
                        </div>
                    </div>
                    </div>
            )}
        </div>
    );
}
