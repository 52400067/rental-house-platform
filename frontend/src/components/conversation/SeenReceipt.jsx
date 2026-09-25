/** Messenger-web seen receipt: tiny round avatar chip of the reader. */
export default function SeenReceipt({ name }) {
    return (
        <div
            className="chat-seen"
            title={`Đã xem bởi ${name || "người kia"}`}
            aria-label="Đã xem"
        >
            <span className="chat-seen-avatar">
                {(name || "?").charAt(0).toUpperCase()}
            </span>
        </div>
    );
}
