import { useCallback, useEffect, useRef, useState } from "react";
import { getConversations, getMessages, markRead } from "../api/socialApi";

/**
 * Conversation header + message list for the /messages/:id thread.
 * Owns: header fetch, initial message load (with last-id tracking for
 * the realtime layer), markRead on open, and per-conversation reset.
 * Realtime updates arrive through useConversationRealtime, which shares
 * setMessages/lastIdRef with this hook via the returned refs/state.
 */
export function useConversationData(id) {
    const [conversation, setConversation] = useState(null);
    const [convLoaded, setConvLoaded] = useState(false);
    const [messages, setMessages] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const lastIdRef = useRef(0);

    // Load conversation header (other user, listing).
    useEffect(() => {
        let active = true;
        setConvLoaded(false);
        getConversations()
            .then((list) => {
                if (active) setConversation(list.find((c) => String(c.id) === String(id)));
            })
            .catch(() => {})
            .finally(() => {
                if (active) setConvLoaded(true);
            });
        return () => {
            active = false;
        };
    }, [id]);

    // Initial load (polls replaced by the Reverb WebSocket subscription).
    const reload = useCallback(async () => {
        try {
            const rows = await getMessages(id);
            lastIdRef.current = rows.length ? rows[rows.length - 1].id : 0;
            setMessages(rows);
            markRead(id).catch(() => {});
        } catch {
            // transient - the realtime subscriber is not affected
        } finally {
            setLoaded(true);
        }
    }, [id]);

    useEffect(() => {
        setMessages([]);
        setLoaded(false);
        lastIdRef.current = 0;
        reload();
    }, [id, reload]);

    return {
        conversation,
        convLoaded,
        messages,
        setMessages,
        loaded,
        lastIdRef,
        reload,
    };
}
