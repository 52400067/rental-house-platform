import { useEffect, useRef } from "react";

/**
 * Autoscroll for chat threads: follow new content only when the user is
 * already at (or near) the bottom, so reading history is not yanked down
 * while new messages arrive. Returns the thread ref to attach and the
 * scroll handler that keeps future decisions DOM-accurate.
 */
export function useStickToBottom(messages, loaded) {
    const threadRef = useRef(null);

    useEffect(() => {
        const el = threadRef.current;
        if (!el) return;
        const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (nearBottom) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, loaded]);

    function handleScroll() {
        const el = threadRef.current;
        if (!el) return;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    }

    return { threadRef, handleScroll };
}
