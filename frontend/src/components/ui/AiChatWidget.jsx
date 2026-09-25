import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { aiChat } from "../../api/aiApi";
import { errMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import AiDisclaimer from "../AiDisclaimer";
import ChatBubble from "../conversation/ChatBubble";
import TypingIndicator from "../conversation/TypingIndicator";

// Home tile dispatches this to open the widget instead of navigating.
export const AI_CHAT_OPEN_EVENT = "trosv:ai-chat-open";

/**
 * Floating AI assistant, Facebook-messenger style: a round launcher pinned
 * bottom-right toggles a popup chat box. The thread survives open/close and
 * lives site-wide; guests get a login CTA (the API requires auth, and a
 * failed guest request would trip the axios 401 redirect to /login).
 *
 * Bubble/thread/composer markup is the SHARED chat language
 * (components/conversation/) - the widget maps its role-based messages
 * onto the same ChatBubble used by user-to-user threads.
 */
export default function AiChatWidget() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Fresh thread per login identity (logout -> login starts over).
    useEffect(() => {
        setMessages([]);
        setError("");
        setBusy(false);
    }, [user?.id]);

    // Home "Trợ lý AI" tile (and any other caller) opens the popup.
    useEffect(() => {
        const openChat = () => setOpen(true);
        window.addEventListener(AI_CHAT_OPEN_EVENT, openChat);
        return () => window.removeEventListener(AI_CHAT_OPEN_EVENT, openChat);
    }, []);

    // Esc minimizes, like closing a Messenger head.
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    // Keep the newest bubble in view + focus the composer once open.
    useEffect(() => {
        if (!open) return undefined;
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        const t = setTimeout(() => inputRef.current?.focus(), 150);
        return () => clearTimeout(t);
    }, [open, messages, busy]);

    async function send(e) {
        e.preventDefault();
        const text = input.trim();
        if (!text || busy) return;

        const history = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setInput("");
        setBusy(true);
        setError("");

        try {
            const { reply } = await aiChat(text, history);
            setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        } catch (err) {
            setError(errMessage(err, "Trợ lý AI tạm thời không trả lời được."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={`ai-widget${open ? " open" : ""}`}>
            {open && (
                <div className="ai-widget-panel" role="dialog" aria-label="Trợ lý AI">
                    <div className="ai-widget-header">
                        <span className="ai-widget-avatar">
                            <i className="bi bi-robot" />
                        </span>
                        <div className="flex-grow-1 min-width-0">
                            <div className="fw-bold small">Trợ lý AI</div>
                            <div className="ai-widget-status">
                                <span className="ai-widget-dot" />
                                Phòng trọ, giá thuê, tiền cọc &amp; hợp đồng
                            </div>
                        </div>
                        <button
                            type="button"
                            className="ai-widget-close"
                            onClick={() => setOpen(false)}
                            aria-label="Thu nhỏ trò chuyện"
                            title="Thu nhỏ"
                        >
                            <i className="bi bi-dash-lg" />
                        </button>
                    </div>

                    {!user ? (
                        <div className="ai-widget-guest">
                            <span className="ai-widget-guest-icon">
                                <i className="bi bi-robot" />
                            </span>
                            <p className="small mb-0">
                                Đăng nhập để trò chuyện với trợ lý AI về phòng trọ, khu
                                vực, giá thuê, tiền cọc và hợp đồng.
                            </p>
                            <Link
                                to="/login"
                                className="btn btn-primary btn-sm ai-widget-guest-btn"
                                onClick={() => setOpen(false)}
                            >
                                <i className="bi bi-box-arrow-in-right me-1" />
                                Đăng nhập
                            </Link>
                            <AiDisclaimer />
                        </div>
                    ) : (
                        <>
                            {/* Same bubble language as user-to-user chat, via
                                the shared ChatBubble: .chat-thread canvas +
                                .chat-row/.chat-bubble. Mine (user) = lime. */}
                            <div className="chat-thread ai-widget-thread">
                                {messages.length === 0 && !busy && (
                                    <div className="chat-empty">
                                        <i className="bi bi-robot fs-1" />
                                        <p className="small mb-0">
                                            Ví dụ: "Tiền cọc thường là bao nhiêu?" hoặc
                                            "Khu vực nào gần ĐHQG mà rẻ?"
                                        </p>
                                    </div>
                                )}

                                {messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={`chat-row ${m.role === "user" ? "mine" : ""}`}
                                    >
                                        {/* AI bubbles keep pre-wrap text and no
                                            timestamp (no created_at - not part
                                            of the AI contract). */}
                                        <ChatBubble
                                            m={{ body: m.content, is_unsent: false }}
                                            showTime={false}
                                        />
                                    </div>
                                ))}

                                {busy && <TypingIndicator withText="Đang soạn trả lời..." />}

                                <div ref={bottomRef} />
                            </div>

                            {error && <div className="chat-error">{error}</div>}

                            <form onSubmit={send} className="chat-composer ai-widget-composer">
                                <input
                                    ref={inputRef}
                                    className="form-control"
                                    placeholder="Nhập câu hỏi của bạn..."
                                    maxLength={1000}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <button
                                    className="btn btn-send"
                                    disabled={busy || !input.trim()}
                                    aria-label="Gửi"
                                    title="Gửi"
                                >
                                    <i className="bi bi-send" />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}

            <button
                type="button"
                className="ai-widget-launcher"
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Thu nhỏ trợ lý AI" : "Mở trợ lý AI"}
                aria-expanded={open}
                title="Trợ lý AI"
            >
                <i className={`bi ${open ? "bi-x-lg" : "bi-robot"}`} />
            </button>
        </div>
    );
}
