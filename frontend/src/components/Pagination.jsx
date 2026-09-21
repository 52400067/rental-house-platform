/** Barebone pagination from API meta { current_page, last_page }. */
export default function Pagination({ meta, onPage }) {
    if (!meta || meta.last_page <= 1) return null;
    const { current_page, last_page } = meta;
    const pages = [];
    for (let p = 1; p <= last_page; p++) pages.push(p);

    return (
        <nav className="d-flex justify-content-center mt-4">
            <ul className="pagination">
                <li
                    className={`page-item ${current_page === 1 ? "disabled" : ""}`}
                >
                    <button
                        className="page-link"
                        onClick={() => onPage(current_page - 1)}
                    >
                        <i className="bi bi-chevron-left" />
                    </button>
                </li>
                {pages.map((p) => (
                    <li
                        key={p}
                        className={`page-item ${p === current_page ? "active" : ""}`}
                    >
                        <button className="page-link" onClick={() => onPage(p)}>
                            {p}
                        </button>
                    </li>
                ))}
                <li
                    className={`page-item ${current_page === last_page ? "disabled" : ""}`}
                >
                    <button
                        className="page-link"
                        onClick={() => onPage(current_page + 1)}
                    >
                        <i className="bi bi-chevron-right" />
                    </button>
                </li>
            </ul>
        </nav>
    );
}
