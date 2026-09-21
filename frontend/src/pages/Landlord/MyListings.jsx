import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    getMyListings,
    deleteListing,
    updateListing,
} from "../../api/landlordApi";
import {
    STATUS_BADGES,
    STATUS_LABELS,
    TYPE_LABELS,
    formatPriceTrieu,
} from "../../api/format";
import { errMessage } from "../../api/axiosClient";
import Pagination from "../../components/Pagination";

export default function MyListings() {
    const [listings, setListings] = useState([]);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(
        (p = 1) => {
            setLoading(true);
            getMyListings(p, status)
                .then(({ data, meta }) => {
                    setListings(data);
                    setMeta(meta);
                })
                .catch((err) => setError(errMessage(err)))
                .finally(() => setLoading(false));
        },
        [status]
    );

    useEffect(() => {
        load(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, status]);

    async function handleDelete(listing) {
        if (!window.confirm(`Xóa tin "${listing.title}"? Không thể hoàn tác.`))
            return;
        try {
            await deleteListing(listing.id);
            load(page);
        } catch (err) {
            alert(errMessage(err));
        }
    }

    async function handleStatus(listing, newStatus) {
        try {
            const updated = await updateListing(listing.id, { status: newStatus });
            setListings((rows) =>
                rows.map((l) => (l.id === listing.id ? updated : l))
            );
        } catch (err) {
            alert(errMessage(err));
        }
    }

    return (
        <div className="py-4">
            <div className="container">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <div>
                        <h1 className="h3 fw-bold mb-0">Tin đăng của tôi</h1>
                        <span className="text-secondary small">
                            {meta ? `${meta.total} tin` : ""}
                        </span>
                    </div>
                    <Link to="/landlord/new" className="btn btn-primary">
                        <i className="bi bi-plus-lg me-1" /> Đăng tin mới
                    </Link>
                </div>

                <div className="mb-3">
                    <select
                        className="form-select form-select-sm w-auto"
                        value={status}
                        onChange={(e) => {
                            setPage(1);
                            setStatus(e.target.value);
                        }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="available">Còn trống</option>
                        <option value="rented">Đã thuê</option>
                        <option value="hidden">Ẩn</option>
                    </select>
                </div>

                {loading && (
                    <div className="text-center py-5">
                        <div className="spinner-border" role="status" />
                    </div>
                )}

                {error && <div className="alert alert-warning">{error}</div>}

                {!loading && listings.length === 0 && !error && (
                    <div className="text-center py-5">
                        <i className="bi bi-house-add fs-1 text-secondary" />
                        <h4 className="mt-3">Chưa có tin đăng nào</h4>
                        <Link to="/landlord/new" className="btn btn-primary">
                            Đăng tin đầu tiên
                        </Link>
                    </div>
                )}

                <div className="list-group">
                    {listings.map((l) => (
                        <div
                            key={l.id}
                            className="list-group-item d-flex gap-3 align-items-center"
                        >
                            {l.cover_image ? (
                                <img
                                    src={l.cover_image}
                                    alt=""
                                    className="rounded"
                                    style={{ width: 72, height: 54, objectFit: "cover" }}
                                />
                            ) : (
                                <div
                                    className="rounded bg-light d-flex align-items-center justify-content-center"
                                    style={{ width: 72, height: 54 }}
                                >
                                    <i className="bi bi-house-door text-secondary" />
                                </div>
                            )}

                            <div className="flex-grow-1 overflow-hidden">
                                <Link
                                    to={`/rooms/${l.id}`}
                                    className="fw-semibold text-decoration-none text-truncate d-block"
                                >
                                    {l.title}
                                </Link>
                                <div className="small text-secondary text-truncate">
                                    {TYPE_LABELS[l.type]} · {l.area_m2} m² ·{" "}
                                    {formatPriceTrieu(l.price)}/tháng
                                    {l.reviews_count > 0 && (
                                        <>
                                            {" · "}
                                            <i className="bi bi-star-fill text-warning me-1" />
                                            {l.avg_rating} ({l.reviews_count})
                                        </>
                                    )}
                                </div>
                            </div>

                            <span className={`badge text-bg-${STATUS_BADGES[l.status]}`}>
                                {STATUS_LABELS[l.status]}
                            </span>

                            <select
                                className="form-select form-select-sm w-auto"
                                value={l.status}
                                onChange={(e) => handleStatus(l, e.target.value)}
                                title="Đổi trạng thái"
                            >
                                <option value="available">Còn trống</option>
                                <option value="rented">Đã thuê</option>
                                <option value="hidden">Ẩn</option>
                            </select>

                            <div className="d-flex gap-1">
                                <Link
                                    to={`/landlord/edit/${l.id}`}
                                    className="btn btn-outline-secondary btn-sm"
                                    title="Sửa"
                                >
                                    <i className="bi bi-pencil" />
                                </Link>
                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleDelete(l)}
                                    title="Xóa"
                                >
                                    <i className="bi bi-trash" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <Pagination
                    meta={meta}
                    onPage={(p) => {
                        setPage(p);
                        window.scrollTo(0, 0);
                    }}
                />
            </div>
        </div>
    );
}
