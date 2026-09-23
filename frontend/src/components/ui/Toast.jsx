import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

const ICONS = {
    success: "bi-check-circle-fill",
    error: "bi-x-circle-fill",
    info: "bi-info-circle-fill",
};

let nextId = 1;

/**
 * Lightweight toast notifications (no external dependency).
 * Wrap the app once, then call `toast.success("...")` etc. anywhere.
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((list) => list.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (type, message, duration = 3500) => {
            const id = nextId++;
            setToasts((list) => [...list, { id, type, message }]);
            window.setTimeout(() => dismiss(id), duration);
            return id;
        },
        [dismiss]
    );

    const api = useMemo(
        () => ({
            success: (msg, duration) => push("success", msg, duration),
            error: (msg, duration) => push("error", msg, duration),
            info: (msg, duration) => push("info", msg, duration),
        }),
        [push]
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-stack" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast-item ${t.type}`} role="status">
                        <i className={`bi ${ICONS[t.type]}`} />
                        <div className="small flex-grow-1">{t.message}</div>
                        <button
                            type="button"
                            className="btn-close btn-close-sm ms-1"
                            aria-label="Đóng"
                            onClick={() => dismiss(t.id)}
                        />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used inside <ToastProvider>");
    }
    return ctx;
}
