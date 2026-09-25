import Echo from "laravel-echo";
import Pusher from "pusher-js";

/**
 * Laravel Echo over Reverb (WebSocket) - replaces HTTP polling for chat.
 *
 * Auth: the SPA uses Sanctum PERSONAL ACCESS TOKENS (Bearer), no cookies,
 * so Echo must send the Authorization header to /broadcasting/auth (the
 * route lives in the api middleware group - see bootstrap/app.php).
 *
 * Events use broadcastAs() names (message.sent / message.deleted), so the
 * client listens on the DOT-PREFIXED names (".message.sent", ...).
 */

let echo = null;

function reverbConfig() {
    return {
        key: import.meta.env.VITE_REVERB_APP_KEY || "my-app-key",
        wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
        wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
        forceTLS: false,
        disableStats: true,
        enabledTransports: ["ws", "wss"],
        // Bearer-token auth for private channels. NOTE: authorize's first
        // arg is the socketId string, not a params object.
        authorizer: (channel) => ({
            authorize: (socketId, callback) => {
                const token = localStorage.getItem("token");
                const api = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
                const base = api.replace(/\/api\/?$/, "");
                fetch(`${base}/broadcasting/auth`, {
                    method: "POST",
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                })
                    .then(async (res) => {
                        if (!res.ok) throw new Error(`auth ${res.status}`);
                        callback(null, await res.json());
                    })
                    .catch(callback);
            },
        }),
    };
}

/** Singleton Echo instance; null while logged out. */
export function getEcho() {
    if (echo) return echo;
    if (!localStorage.getItem("token")) return null;

    window.Pusher = Pusher;
    echo = new Echo({ broadcaster: "reverb", ...reverbConfig() });
    return echo;
}

/** Drop the socket + subscriptions (logout / auth change). */
export function disconnectEcho() {
    if (!echo) return;
    echo.disconnect();
    echo = null;
}
