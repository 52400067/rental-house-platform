import { Link } from "react-router-dom";
import { TYPE_LABELS, formatPriceTrieu } from "../api/format";

/**
 * Barebone listing card per API_CONTRACT §3 Listing (tóm tắt).
 * `onToggleFavorite` makes the heart interactive when provided.
 */
export default function ListingCard({ listing, onToggleFavorite }) {
    return (
        <div className="card h-100 listing-card">
            <div className="position-relative">
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

                <span className="badge text-bg-light position-absolute top-0 start-0 m-2">
                    {TYPE_LABELS[listing.type] || listing.type}
                </span>

                {onToggleFavorite && (
                    <button
                        type="button"
                        className="btn btn-light btn-sm position-absolute top-0 end-0 m-2 rounded-circle"
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

                <p className="small mb-2" style={{ color: "var(--bs-secondary-color)" }}>
                    <i className="bi bi-geo-alt me-1" />
                    {listing.address}
                    {listing.ward ? `, ${listing.ward.name}` : ""}
                </p>

                <div className="d-flex flex-wrap gap-3 small mb-2">
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
                            <i className="bi bi-star-fill text-warning me-1" />
                            {listing.avg_rating} ({listing.reviews_count})
                        </span>
                    )}
                </div>

                <div className="mt-auto fw-bold fs-5" style={{ color: "var(--brand)" }}>
                    {formatPriceTrieu(listing.price)}
                    <span className="fw-normal small"> /tháng</span>
                </div>
            </div>
        </div>
    );
}
