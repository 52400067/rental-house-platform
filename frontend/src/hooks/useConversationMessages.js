import { useState } from "react";
import { deleteMessage, reactToMessage, sendMessage } from "../api/socialApi";
import { errMessage } from "../api/axiosClient";

/**
 * Message actions for the thread: send (with dedup against the WS event),
 * delete (unsend/delete-for-me optimistic update), react (optimistic toggle
 * with server reconciliation) and copy. Wraps the API layer so the page
 * component stays declarative. Errors land in `error` for inline display
 * (attachment/send problems); menu actions toast via the caller.
 */
export function useConversationMessages(id, setMessages, lastIdRef) {
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    async function send(text, file) {
        setError("");
        setSending(true);
        try {
            const msg = await sendMessage(id, { body: text, file });
            // The sender's own .message.sent WS event usually lands BEFORE
            // this HTTP response resolves - skip if already drawn.
            setMessages((prev) =>
                prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
            lastIdRef.current = Math.max(lastIdRef.current, msg.id);
            return msg;
        } catch (err) {
            setError(errMessage(err));
            return null;
        } finally {
            setSending(false);
        }
    }

    async function remove(m, scope) {
        try {
            await deleteMessage(m.id, scope);
            setMessages((prev) =>
                scope === "unsent"
                    ? prev.map((x) =>
                          x.id === m.id
                              ? { ...x, is_unsent: true, body: null, attachment_url: null, attachment_name: null }
                              : x
                      )
                    : prev.filter((x) => x.id !== m.id)
            );
            return true;
        } catch (err) {
            setError(errMessage(err));
            return false;
        }
    }

    /** Optimistic toggle; the .message.reacted event reconciles everyone. */
    async function react(m, emoji, myId) {
        const prevMap = m.reactions || {};
        const mine = String(myId);
        const optimistic = { ...prevMap };
        if (prevMap[mine] === emoji) delete optimistic[mine];
        else optimistic[mine] = emoji;

        setMessages((prev) =>
            prev.map((x) => (x.id === m.id ? { ...x, reactions: optimistic } : x))
        );

        try {
            const serverMap = await reactToMessage(m.id, emoji);
            setMessages((prev) =>
                prev.map((x) => (x.id === m.id ? { ...x, reactions: serverMap } : x))
            );
            return true;
        } catch (err) {
            setMessages((prev) =>
                prev.map((x) => (x.id === m.id ? { ...x, reactions: prevMap } : x))
            );
            setError(errMessage(err));
            return false;
        }
    }

    return { send, remove, react, sending, error, setError };
}
