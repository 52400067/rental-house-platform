import { useEffect } from "react";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😠"];

/** Facebook-style: sender may unsend within 1 hour of sending. */
function canUnsend(m) {
    return (
        m.is_mine &&
        !m.is_unsent &&
        Date.now() - new Date(m.created_at).getTime() < 60 * 60 * 1000
    );
}

/**
 * Messenger web message menu: reaction picker row + copy/unsend/delete.
 * Rendered inside the bubble wrap, anchored to it; `up` flips it above the
 * anchor when near the thread bottom (decided by the caller, which owns
 * the DOM geometry).
 */
export default function MessageMenu({ m, myId, up, onReact, onCopy, onDelete, onClose, onAskUnsend }) {
    // Đóng menu khi bấm ra ngoài; Esc đóng menu (caller giữ Esc cho dialog).
    useEffect(() => {
        const close = () => onClose();
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [onClose]);

    return (
        <div className={`chat-menu${up ? " up" : ""}`} onClick={(e) => e.stopPropagation()}>
            <div className="chat-reaction-row">
                {REACTIONS.map((emoji) => (
                    <button
                        key={emoji}
                        type="button"
                        className={`chat-reaction-emoji${
                            (m.reactions || {})[String(myId)] === emoji ? " mine" : ""
                        }`}
                        onClick={() => onReact(m, emoji)}
                        aria-label={`Thả cảm xúc ${emoji}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <div className="chat-menu-divider" />
            {m.body && (
                <button type="button" onClick={() => onCopy(m)}>
                    <i className="bi bi-clipboard me-2" />
                    Copy văn bản
                </button>
            )}
            {canUnsend(m) && (
                <button
                    type="button"
                    className="danger"
                    onClick={() => onAskUnsend(m)}
                >
                    <i className="bi bi-arrow-counterclockwise me-2" />
                    Thu hồi
                </button>
            )}
            <button type="button" onClick={() => onDelete(m, "self")}>
                <i className="bi bi-trash3 me-2" />
                Xóa chỉ ở phía mình
            </button>
        </div>
    );
}
