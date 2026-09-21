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

                <div
                    className="border rounded-3 p-3 mb-3 bg-light overflow-auto"
                    style={{ height: 420 }}
                >
                    {messages.length === 0 && !busy && (
                        <div className="text-center py-4">
                            <i className="bi bi-robot fs-1 text-secondary" />
                            <p className="small text-secondary mt-2 mb-0">
                                Ví dụ: "Tiền cọc thường là bao nhiêu?" hoặc "Khu vực nào
                                gần ĐHQG mà rẻ?"
                            </p>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={`d-flex mb-2 ${
                                m.role === "user"
                                    ? "justify-content-end"
                                    : "justify-content-start"
                            }`}
                        >
                            <div
                                className={`px-3 py-2 rounded-3 small ${
                                    m.role === "user"
                                        ? "text-white"
                                        : "bg-white border"
                                }`}
                                style={{
                                    maxWidth: "80%",
                                    whiteSpace: "pre-wrap",
                                    backgroundColor:
                                        m.role === "user" ? "var(--brand)" : undefined,
                                }}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {busy && (
                        <div className="d-flex justify-content-start">
                            <div className="px-3 py-2 rounded-3 bg-white border small">
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

                <form onSubmit={send} className="d-flex gap-2">
                    <input
                        className="form-control"
                        placeholder="Nhập câu hỏi của bạn..."
                        maxLength={1000}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button className="btn btn-primary" disabled={busy || !input.trim()}>
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
