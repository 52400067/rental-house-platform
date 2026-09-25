import { formatDateTime } from "../../api/format";
import Pagination from "../Pagination";

/** Review rows + pagination for the listing detail page. */
export default function ReviewList({ reviews, meta, onPage }) {
    return (
        <>
            {reviews.length === 0 ? (
                <p className="text-secondary small">Chưa có đánh giá nào.</p>
            ) : (
                reviews.map((r) => (
                    <div className="border-bottom py-3" key={r.id}>
                        <div className="d-flex justify-content-between">
                            <strong className="small">{r.student?.name}</strong>
                            <span className="small text-secondary">
                                {formatDateTime(r.created_at)}
                            </span>
                        </div>
                        <div className="small">
                            Tin:{" "}
                            <span className="text-warning">
                                {"★".repeat(r.listing_rating)}
                                {"☆".repeat(5 - r.listing_rating)}
                            </span>
                            {" · "}
                            Chủ nhà:{" "}
                            <span className="text-warning">
                                {"★".repeat(r.landlord_rating)}
                                {"☆".repeat(5 - r.landlord_rating)}
                            </span>
                        </div>
                        {r.comment && <p className="small prose mb-0 mt-1">{r.comment}</p>}
                    </div>
                ))
            )}
            <Pagination meta={meta} onPage={onPage} />
        </>
    );
}
