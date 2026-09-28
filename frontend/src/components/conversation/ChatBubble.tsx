import { timeLabel } from "./labels";
import type { Message } from "../../types/api";
import type { MouseEvent } from "react";

/**
 * One bubble shape for every chat surface: user-to-user threads and the AI
 * widget map their items onto the same bubble language. Wraps the unsent
 * tombstone, body/attachment content, timestamp and per-emoji reaction
 * chips. Interaction (menus, reactions) stays with the owner - pass
 * onBubbleClick to anchor a message menu.
 */
export default function ChatBubble({
  m,
  children,
  onBubbleClick,
  showTime = true,
}: {
  // Message cua thread; AI widget dua object nho hon (khong co created_at).
  m: Partial<Pick<Message, "created_at">> &
    Pick<Message, "is_unsent" | "body" | "attachment_url" | "attachment_name">;
  children?: React.ReactNode;
  onBubbleClick?: (el: HTMLElement) => void;
  showTime?: boolean;
}) {
  const hasTime = showTime && m.created_at && !Number.isNaN(new Date(m.created_at).getTime());
  return (
    <div className="chat-bubble-wrap">
      {m.is_unsent ? (
        <div className="chat-bubble chat-bubble-unsent">
          <i className="bi bi-slash-circle me-1" />
          Tin nhắn đã được thu hồi
          {hasTime && <span className="chat-time">{timeLabel(m.created_at as string)}</span>}
        </div>
      ) : (
        <div
          className="chat-bubble"
          onClick={
            onBubbleClick
              ? (e: MouseEvent<HTMLDivElement>) => {
                  // Ngăn click mở menu lan lên window - listener đóng
                  // menu của MessageMenu sẽ tắt menu ngay lập tức.
                  e.stopPropagation();
                  onBubbleClick(e.currentTarget);
                }
              : undefined
          }
          title={onBubbleClick ? "Tùy chọn tin nhắn" : undefined}
        >
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
          {hasTime && <span className="chat-time">{timeLabel(m.created_at as string)}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
