/**
 * Pagination from API meta { current_page, last_page }.
 * Shows a sliding window of pages with ellipses when there are many pages.
 */
export default function Pagination({ meta, onPage }) {
    if (!meta || meta.last_page <= 1) return null;
    const { current_page, last_page } = meta;

    // Build a windowed page list: 1 ... (c-1 c c+1) ... last
    const pages = [];
    const push = (p) => pages.push(p);
    const pushEllipsis = () => {
        if (pages[pages.length - 1] !== "...") pages.push("...");
    };

    push(1);
    if (current_page > 3) pushEllipsis();
    for (
        let p = Math.max(2, current_page - 1);
        p <= Math.min(last_page - 1, current_page + 1);
        p++
    ) {
        push(p);
    }
    if (current_page < last_page - 2) pushEllipsis();
    if (last_page > 1) push(last_page);

    return (
        <nav className="d-flex justify-content-center mt-4" aria-label="Phân trang">
            <ul className="pagination pagination-lg gap-1">
                <li
                    className={`page-item ${current_page === 1 ? "disabled" : ""}`}
                >
                    <button
                        className="page-link"
                        aria-label="Trang trước"
                        disabled={current_page === 1}
                        onClick={() => onPage(current_page - 1)}
                    >
                        <i className="bi bi-chevron-left" />
                    </button>
                </li>
                {pages.map((p, i) =>
                    p === "..." ? (
                        <li key={`ellipsis-${i}`} className="page-item disabled">
                            <span className="page-link px-2">…</span>
                        </li>
                    ) : (
                        <li
                            key={p}
                            className={`page-item ${p === current_page ? "active" : ""}`}
                        >
                            <button className="page-link" onClick={() => onPage(p)}>
                                {p}
                            </button>
                        </li>
                    )
                )}
                <li
                    className={`page-item ${current_page === last_page ? "disabled" : ""}`}
                >
                    <button
                        className="page-link"
                        aria-label="Trang sau"
                        disabled={current_page === last_page}
                        onClick={() => onPage(current_page + 1)}
                    >
                        <i className="bi bi-chevron-right" />
                    </button>
                </li>
            </ul>
        </nav>
    );
}
