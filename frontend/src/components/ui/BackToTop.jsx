import { useEffect, useState } from "react";

/** Floating button that appears after scrolling and scrolls back to top. */
export default function BackToTop() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 400);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <button
            type="button"
            className={`back-to-top ${show ? "show" : ""}`}
            aria-label="Về đầu trang"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
            <i className="bi bi-arrow-up" />
        </button>
    );
}
