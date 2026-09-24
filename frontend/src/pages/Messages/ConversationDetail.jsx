import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getConversations,
    getMessages,
    sendMessage,
    markRead,
} from "../../api/socialApi";
import { errMessage } from "../../api/axiosClient";
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
    const [messages, setMessages] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [body, setBody] = useState("");
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const threadRef = useRef(null);
    const lastIdRef = useRef(0);
    const fileInputRef = useRef(null);
    const stickToBottom = useRef(true);

    // Load conversation header (other user, listing).
    useEffect(() => {
        let active = true;
        getConversations()
            .then((list) => {
                if (active) setConversation(list.find((c) => String(c.id) === String(id)));
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [id]);

    // Full load, then poll for newer messages every 5s (API_CONTRACT §4).
    const poll = useCallback(async () => {
        try {
            const rows = await getMessages(id, lastIdRef.current);
            if (rows.length > 0) {
                lastIdRef.current = rows[rows.length - 1].id;
                setMessages((prev) => {
                    const merged = prev.length === 0 ? rows : [...prev, ...rows];
                    // Dedup: optimistic sends can race the poll.
                    const seen = new Set();
                    return merged.filter((m) =>
                        seen.has(m.id) ? false : (seen.add(m.id), true)
                    );
                });
                markRead(id).catch(() => {});
            }
            setLoaded(true);
        } catch {
            // transient - next poll retries
        }
    }, [id]);

    useEffect(() => {
        setMessages([]);
        setLoaded(false);
        lastIdRef.current = 0;
        poll();
        const timer = setInterval(poll, 5000);
        return () => clearInterval(timer);
    }, [id, poll]);

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
            setMessages((prev) => [...prev, msg]);
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

    return (
        <div className="chat-page">
            {/* Header */}
            <div className="chat-header mb-3">
                <Link
                    to="/messages"
                    className="btn btn-outline-secondary btn-sm"
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
                                <div className="chat-bubble">
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
                            </div>
                        </div>
                    ))
                )}
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
                    onChange={(e) => setBody(e.target.value)}
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
            )}
        </div>
    );
}
