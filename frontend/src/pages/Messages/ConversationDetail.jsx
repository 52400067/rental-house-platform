import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getConversations,
    getMessages,
    sendMessage,
    markRead,
} from "../../api/socialApi";
import { timeAgo } from "../../api/format";
import { errMessage } from "../../api/axiosClient";

const MAX_FILE = 5 * 1024 * 1024; // contract: 5 MB
const ALLOWED = /\.(pdf|jpe?g|png|docx)$/i;

export default function ConversationDetail() {
    const { id } = useParams();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState("");
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef(null);
    const lastIdRef = useRef(0);
    const fileInputRef = useRef(null);

    // Load conversation header (other user, listing).
    useEffect(() => {
        getConversations()
            .then((list) =>
                setConversation(list.find((c) => String(c.id) === String(id)))
            )
            .catch(() => {});
    }, [id]);

    // Full load, then poll for newer messages every 5s (API_CONTRACT §4).
    const poll = useCallback(async () => {
        try {
            const rows = await getMessages(id, lastIdRef.current);
            if (rows.length > 0) {
                lastIdRef.current = rows[rows.length - 1].id;
                setMessages((prev) =>
                    lastIdRef.current === rows[rows.length - 1].id && prev.length === 0
                        ? rows
                        : [...prev, ...rows]
                );
                // The first batch of the session also marks the chat as read.
                markRead(id).catch(() => {});
            }
        } catch {
            // transient - next poll retries
        }
    }, [id]);

    useEffect(() => {
        setMessages([]);
        lastIdRef.current = 0;
        poll();
        const timer = setInterval(poll, 5000);
        return () => clearInterval(timer);
    }, [id, poll]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!body.trim() && !file) return;
        setError("");
        setSending(true);
        try {
            const msg = await sendMessage(id, { body: body.trim(), file });
            setMessages((prev) => [...prev, msg]);
            lastIdRef.current = Math.max(lastIdRef.current, msg.id);
            setBody("");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            setError(errMessage(err));
        } finally {
            setSending(false);
        }
    }

    function handleFileChange(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!ALLOWED.test(f.name)) {
            setError("Tệp phải là pdf, jpg, png hoặc docx.");
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

    return (
        <div className="py-4">
            <div className="container" style={{ maxWidth: 760 }}>
                {/* Header */}
                <div className="d-flex align-items-center gap-3 mb-3">
                    <Link to="/messages" className="btn btn-outline-secondary btn-sm">
                        <i className="bi bi-arrow-left" />
                    </Link>
                    <div className="flex-grow-1">
                        <strong className="d-block">
                            {conversation?.other_user?.name || "Hội thoại"}
                        </strong>
                        {conversation?.listing && (
                            <Link
                                to={`/rooms/${conversation.listing.id}`}
                                className="small text-decoration-none"
                            >
                                {conversation.listing.title}
                            </Link>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div
                    className="border rounded-3 p-3 mb-3 bg-light overflow-auto"
                    style={{ height: 440 }}
                >
                    {messages.length === 0 && (
                        <p className="text-secondary small text-center py-4 mb-0">
                            Chưa có tin nhắn. Hãy bắt đầu trò chuyện!
                        </p>
                    )}
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`d-flex mb-2 ${
                                m.is_mine ? "justify-content-end" : "justify-content-start"
                            }`}
                        >
                            <div
                                className={`px-3 py-2 rounded-3 ${
                                    m.is_mine ? "text-white" : "bg-white border"
                                }`}
                                style={{
                                    maxWidth: "75%",
                                    backgroundColor: m.is_mine
                                        ? "var(--brand)"
                                        : undefined,
                                }}
                            >
                                {m.body && <div className="small">{m.body}</div>}
                                {m.attachment_url && (
                                    <a
                                        href={m.attachment_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`d-block small mt-1 ${
                                            m.is_mine ? "text-white-50" : ""
                                        }`}
                                    >
                                        <i className="bi bi-paperclip me-1" />
                                        {m.attachment_name}
                                    </a>
                                )}
                                <div
                                    className={`text-end ${
                                        m.is_mine ? "text-white-50" : "text-secondary"
                                    }`}
                                    style={{ fontSize: "0.7rem" }}
                                >
                                    {timeAgo(m.created_at)}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {error && (
                    <div className="alert alert-danger py-2 small">{error}</div>
                )}

                {/* Composer */}
                <form onSubmit={handleSubmit} className="d-flex gap-2 align-items-center">
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
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập tin nhắn..."
                        maxLength={1000}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />
                    <button className="btn btn-primary" disabled={sending}>
                        {sending ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            <i className="bi bi-send" />
                        )}
                    </button>
                </form>
                {file && (
                    <div className="small mt-2">
                        <i className="bi bi-file-earmark me-1" />
                        {file.name}
                        <button
                            type="button"
                            className="btn btn-link btn-sm p-0 ms-2 text-danger"
                            onClick={() => setFile(null)}
                        >
                            Gỡ
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
