import { useEffect, useState } from "react";

/**
 * Messenger message-menu state for the thread: which message has the menu
 * open, and whether it should flip above the anchor (when the anchor sits
 * near the thread bottom, the menu would otherwise be clipped).
 *
 * Menu is closed by clicking outside (window click) or Escape — Escape also
 * cancels the pending unsend confirmation.
 */
export function useMessageMenu(threadRef) {
    const [menuFor, setMenuFor] = useState(null);
    const [menuUp, setMenuUp] = useState(false);
    const [confirmUnsend, setConfirmUnsend] = useState(null);

    function openMenuFor(m, anchorEl) {
        if (menuFor === m.id) {
            setMenuFor(null);
            return;
        }
        const wrap = anchorEl.closest(".chat-bubble-wrap");
        const thread = threadRef.current;
        if (wrap && thread) {
            const wr = wrap.getBoundingClientRect();
            const tr = thread.getBoundingClientRect();
            const MENU_H = 110;
            setMenuUp(tr.bottom - wr.bottom < MENU_H);
        }
        setMenuFor(m.id);
    }

    // Đóng menu khi bấm ra ngoài; Esc đóng cả menu lẫn hộp thoại thu hồi.
    useEffect(() => {
        if (menuFor == null && !confirmUnsend) return undefined;
        const close = () => setMenuFor(null);
        const onKey = (e) => {
            if (e.key === "Escape") {
                setMenuFor(null);
                setConfirmUnsend(null);
            }
        };
        window.addEventListener("click", close);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("keydown", onKey);
        };
    }, [menuFor, confirmUnsend]);

    return {
        menuFor,
        setMenuFor,
        menuUp,
        confirmUnsend,
        setConfirmUnsend,
        openMenuFor,
    };
}
