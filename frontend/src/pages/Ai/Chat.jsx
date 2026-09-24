import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { aiChat } from "../../api/aiApi";
import { getListing } from "../../api/listingApi";
import { errMessage } from "../../api/axiosClient";
import { formatVnd } from "../../api/format";
import AiDisclaimer from "../../components/AiDisclaimer";

export default function AiChat() {
    const [searchParams] = useSearchParams();
    const listingId = searchParams.get("listing_id");

    const [listing, setListing] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const bottomRef = useRef(null);

    // Listing context (from "Hỏi AI về phòng này" links).
    useEffect(() => {
        if (listingId) {
            getListing(listingId)
                .then(setListing)
                .catch(() => {});
        }
    }, [listingId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, busy]);

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
            const { reply } = await aiChat(text, history, listingId);
            setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        } catch (err) {
            setError(errMessage(err, "Trợ lý AI tạm thời không trả lời được."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="py-4">
            <div className="container" style={{ maxWidth: 720 }}>
                <h1 className="h3 fw-bold mb-1">
                    <i className="bi bi-robot me-2" />
                    Trợ lý AI
                </h1>
                <p className="text-secondary small">
                    Hỏi về phòng trọ, khu vực, giá thuê, tiền cọc và hợp đồng.
                </p>

                {listing && (
                    <div className="alert alert-light border small">
                        Đang trò chuyện về tin:{" "}
                        <strong>{listing.title}</strong> ({formatVnd(listing.price)}/tháng)
                    </div>
                )}

                {/* Same bubble language as user-to-user chat:
                    .chat-thread canvas + .chat-row/.chat-bubble. Mine
                    (user) = lime fill with INK text - never white on lime. */}
                <div className="chat-thread mb-3" style={{ height: 460 }}>
                    {messages.length === 0 && !busy && (
                        <div className="chat-empty">
                            <i className="bi bi-robot fs-1" />
                            <p className="small mb-0">
                                Ví dụ: "Tiền cọc thường là bao nhiêu?" hoặc "Khu vực nào
                                gần ĐHQG mà rẻ?"
                            </p>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`chat-row ${m.role === "user" ? "mine" : ""}`}
                        >
                            <div
                                className="chat-bubble"
                                style={{ whiteSpace: "pre-wrap" }}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {busy && (
                        <div className="chat-row">
                            <div className="chat-bubble">
                                <span
                                    className="spinner-grow spinner-grow-sm me-2"
                                    role="status"
                                />
                                Đang soạn trả lời...
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {error && (
                    <div className="alert alert-warning py-2 small">{error}</div>
                )}

                <form onSubmit={send} className="chat-composer">
                    <input
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

                <div className="mt-2">
                    <AiDisclaimer />
                </div>
            </div>
        </div>
    );
}
