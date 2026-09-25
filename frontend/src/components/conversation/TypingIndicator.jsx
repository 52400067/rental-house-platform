/**
 * "Typing" bubble: three bouncing dots, optionally with a text label
 * (the AI widget's "Đang soạn trả lời..." spinner state).
 */
export default function TypingIndicator({ withText }) {
    return (
        <div className="chat-row">
            <div className="chat-bubble chat-typing" aria-label="Đang soạn tin nhắn">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                {withText && <span>{withText}</span>}
            </div>
        </div>
    );
}
