import { Link } from "react-router-dom";
import { TYPE_LABELS, formatPriceTrieu } from "../api/format";

/**
 * Listing card per API_CONTRACT §3 Listing (tóm tắt).
 * `onToggleFavorite` makes the heart interactive when provided.
 * `isNew` adds the amber index-tab flag (used on Home for the newest entry).
 */
export default function ListingCard({ listing, onToggleFavorite, isNew }) {
    return (
        <div className={`card h-100 listing-card${isNew ? " is-new" : ""}`}>
            <div className="position-relative listing-cover-wrap">
                <Link to={`/rooms/${listing.id}`}>
                    {listing.cover_image ? (
                        <img
                            src={listing.cover_image}
                            className="card-img-top listing-cover"
                            alt={listing.title}
                            loading="lazy"
                        />
                    ) : (
                        <div
                            className="card-img-top listing-cover d-flex align-items-center justify-content-center bg-light"
                            style={{ color: "var(--bs-secondary-color)" }}
                        >
                            <i className="bi bi-house-door fs-1" />
                        </div>
                    )}
                </Link>

                <span className="badge text-bg-light position-absolute top-0 start-0 m-2 shadow-sm">
                    {TYPE_LABELS[listing.type] || listing.type}
                </span>

                {onToggleFavorite && (
                    <button
                        type="button"
                        className="btn btn-light btn-sm position-absolute top-0 end-0 m-2 rounded-circle fav-btn"
                        title={
                            listing.is_favorited
                                ? "Bỏ yêu thích"
                                : "Thêm vào yêu thích"
                        }
                        onClick={() => onToggleFavorite(listing)}
                    >
                        <i
                            className={
                                listing.is_favorited
                                    ? "bi bi-heart-fill text-danger"
                                    : "bi bi-heart"
                            }
                        />
                    </button>
                )}
            </div>

            <div className="card-body d-flex flex-column">
                <h6 className="card-title mb-1">
                    <Link
                        to={`/rooms/${listing.id}`}
                        className="text-decoration-none stretched-link-host"
                    >
                        {listing.title}
                    </Link>
                </h6>

                <p className="small mb-2" style={{ color: "var(--muted)" }}>
                    <i className="bi bi-geo-alt me-1" />
                    {listing.address}
                    {listing.ward ? `, ${listing.ward.name}` : ""}
                </p>

                <div className="d-flex flex-wrap gap-3 small mb-2" style={{ color: "var(--ink-soft)" }}>
                    <span>
                        <i className="bi bi-rulers me-1" />
                        {listing.area_m2} m²
                    </span>
                    {listing.distance_km != null && (
                        <span>
                            <i className="bi bi-geo me-1" />
                            {listing.distance_km} km
                        </span>
                    )}
                    {listing.avg_rating != null && (
                        <span>
                            <i className="bi bi-star-fill me-1" style={{ color: "var(--ink)" }} />
                            {listing.avg_rating} ({listing.reviews_count})
                        </span>
                    )}
                </div>

                <div className="mt-auto">
                    <span className="listing-price fs-5">
                        {formatPriceTrieu(listing.price)}
                    </span>
                    <span className="fw-normal small" style={{ color: "var(--muted)" }}>
                        {" "}
                        /tháng
                    </span>
                </div>
            </div>
        </div>
    );
}
