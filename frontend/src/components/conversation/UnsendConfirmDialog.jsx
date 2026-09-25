/**
 * Messenger-style unsend confirm: small centered dialog, one sentence about
 * the consequence, two actions. Overlay click / Hủy dismisses; Thu hồi
 * escalates to the caller's delete flow.
 */
export default function UnsendConfirmDialog({ onCancel, onConfirm }) {
    return (
        <div className="chat-sheet-overlay" onClick={onCancel}>
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
                    <button type="button" className="chat-confirm-btn" onClick={onCancel}>
                        Hủy
                    </button>
                    <button type="button" className="chat-confirm-btn primary" onClick={onConfirm}>
                        Thu hồi
                    </button>
                </div>
            </div>
        </div>
    );
}
