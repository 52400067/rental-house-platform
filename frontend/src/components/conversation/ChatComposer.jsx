import { useRef, useState } from "react";

const MAX_FILE = 5 * 1024 * 1024; // contract: 5 MB
const ALLOWED = /\.(pdf|jpe?g|png|docx)$/i;

/**
 * Chat composer: attachment picker + textarea (Enter sends, Shift+Enter is
 * a newline) + send button. Owns the draft (text + file) internally and
 * clears it when onSend resolves truthy.
 *
 * File validation mirrors the backend contract (pdf/jpg/png/docx, 5 MB)
 * with instant client-side errors; send failures surface through the
 * parent's toast, so only attachment errors render here.
 */
export default function ChatComposer({ onSend, sending, onTyping }) {
    const [body, setBody] = useState("");
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    async function handleSubmit(e) {
        e?.preventDefault();
        const text = body.trim();
        if ((!text && !file) || sending) return;
        const ok = await onSend(text, file);
        if (ok) {
            setBody("");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
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

    return (
        <>
            {error && <div className="chat-error">{error}</div>}

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
                        onTyping?.();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />
                <button
                    type="submit"
                    className="btn btn-send"
                    disabled={sending || (!body.trim() && !file)}
                >
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
        </>
    );
}
