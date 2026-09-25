import { useEffect, useRef, useState } from "react";
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

    // Per-conversation state reset during render (React's recommended
    // "adjust state when props change" idiom) instead of setState inside
    // an effect - the fresh id renders with a clean slate immediately.
    const [prevId, setPrevId] = useState(id);
    if (prevId !== id) {
        setPrevId(id);
        setConversation(null);
        setConvLoaded(false);
        setMessages([]);
        setLoaded(false);
    }

    // Load conversation header (other user, listing).
    useEffect(() => {
        let active = true;
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
    // The effect awaits getMessages before any setState, so no state is
    // set synchronously inside the effect body. lastIdRef resets here too:
    // the previous thread's realtime subscription is torn down in cleanup
    // before this runs, so no new id can read a stale last id.
    useEffect(() => {
        let active = true;
        lastIdRef.current = 0;
        (async () => {
            try {
                const rows = await getMessages(id);
                if (!active) return;
                lastIdRef.current = rows.length ? rows[rows.length - 1].id : 0;
                setMessages(rows);
                markRead(id).catch(() => {});
            } catch {
                // transient - the realtime subscriber is not affected
            } finally {
                if (active) setLoaded(true);
            }
        })();
        return () => {
            active = false;
        };
    }, [id]);

    return {
        conversation,
        convLoaded,
        messages,
        setMessages,
        loaded,
        lastIdRef,
    };
}
