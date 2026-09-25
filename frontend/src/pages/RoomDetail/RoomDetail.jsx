import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CoordinatePicker from "../../components/CoordinatePicker";
import Gallery from "../../components/room/Gallery";
import PriceAdvicePanel from "../../components/room/PriceAdvicePanel";
import ReviewForm from "../../components/room/ReviewForm";
import ReviewList from "../../components/room/ReviewList";
import {
    STATUS_BADGES,
    STATUS_LABELS,
    TYPE_LABELS,
    formatVnd,
} from "../../api/format";
import * as socialApi from "../../api/socialApi";
import { createReview } from "../../api/listingApi";
import { useAuth } from "../../context/AuthContext";
import { errMessage } from "../../api/axiosClient";
import { useToast } from "../../components/ui/Toast";
import RoomDetailSkeleton from "../../components/ui/RoomDetailSkeleton";
import { useRoomDetail } from "../../hooks/useRoomDetail";

export default function RoomDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();

    const {
        listing,
        setListing,
        loading,
        error,
        reviews,
        reviewMeta,
        loadReviews,
    } = useRoomDetail(id, toast);

    const [reviewBusy, setReviewBusy] = useState(false);
    const [chatBusy, setChatBusy] = useState(false);

    const isStudent = user?.role === "student";

    async function toggleFavorite() {
        if (!isStudent) return;
        try {
            if (listing.is_favorited) {
                await socialApi.removeFavorite(listing.id);
            } else {
                await socialApi.addFavorite(listing.id);
            }
            setListing((l) => ({ ...l, is_favorited: !l.is_favorited }));
            toast.success(
                listing.is_favorited ? "Đã bỏ khỏi yêu thích." : "Đã thêm vào yêu thích."
            );
        } catch (err) {
            toast.error(errMessage(err));
        }
    }

    async function handleChat() {
        setChatBusy(true);
        try {
            const conv = await socialApi.startConversation(listing.id);
            navigate(`/messages/${conv.id}`);
        } catch (err) {
            toast.error(errMessage(err));
        } finally {
            setChatBusy(false);
        }
    }

    async function submitReview(form) {
        setReviewBusy(true);
        try {
            await createReview(listing.id, form);
            setListing((l) => ({ ...l, can_review: false }));
            loadReviews(1);
            toast.success("Cảm ơn bạn đã đánh giá!");
        } catch (err) {
            toast.error(errMessage(err));
        } finally {
            setReviewBusy(false);
        }
    }

    if (loading) {
        return <RoomDetailSkeleton />;
    }

    if (error || !listing) {
        return (
            <div className="container py-5 text-center">
                <i className="bi bi-house-x fs-1 text-secondary" />
                <h2 className="mt-3">{error || "Không tìm thấy phòng"}</h2>
                <Link to="/rooms" className="btn btn-primary mt-2">
                    <i className="bi bi-arrow-left me-2" />
                    Quay lại tìm trọ
                </Link>
            </div>
        );
    }

    const images = listing.images?.length
        ? listing.images
        : listing.cover_image
          ? [{ id: 0, url: listing.cover_image }]
          : [];

    return (
        <div className="py-4">
            <div className="container">
                {/* Breadcrumb */}
                <nav aria-label="breadcrumb" className="mb-3">
                    <ol className="breadcrumb small">
                        <li className="breadcrumb-item">
                            <Link to="/">Trang chủ</Link>
                        </li>
                        <li className="breadcrumb-item">
                            <Link to="/rooms">Tìm trọ</Link>
                        </li>
                        <li className="breadcrumb-item active">{listing.title}</li>
                    </ol>
                </nav>

                <div className="row g-4">
                    {/* LEFT: gallery + description + reviews */}
                    <div className="col-lg-8">
                        <Gallery images={images} title={listing.title} />

                        {/* Title block */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h1 className="h4 fw-bold mb-1">{listing.title}</h1>
                                <p className="text-secondary small mb-0">
                                    <i className="bi bi-geo-alt me-1" />
                                    {listing.address}
                                    {listing.ward ? `, ${listing.ward.name}` : ""}
                                </p>
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <span className={`badge text-bg-${STATUS_BADGES[listing.status] || "secondary"}`}>
                                    {STATUS_LABELS[listing.status] || listing.status}
                                </span>
                                {isStudent && (
                                    <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={toggleFavorite}
                                    >
                                        <i
                                            className={
                                                listing.is_favorited
                                                    ? "bi bi-heart-fill"
                                                    : "bi bi-heart"
                                            }
                                        />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Stats row */}
                        <div className="d-flex flex-wrap gap-4 my-3">
                            <div>
                                <div className="fw-bold fs-4" style={{ color: "var(--ink)" }}>
                                    {formatVnd(listing.price)}
                                    <span className="fw-normal small text-secondary">/tháng</span>
                                </div>
                            </div>
                            <div>
                                <div className="fw-bold">{listing.area_m2} m²</div>
                                <div className="small text-secondary">Diện tích</div>
                            </div>
                            <div>
                                <div className="fw-bold">{TYPE_LABELS[listing.type]}</div>
                                <div className="small text-secondary">Loại tin</div>
                            </div>
                            {listing.avg_rating != null && (
                                <div>
                                    <div className="fw-bold">
                                        <i className="bi bi-star-fill text-warning me-1" />
                                        {listing.avg_rating}
                                    </div>
                                    <div className="small text-secondary">
                                        {listing.reviews_count} đánh giá
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Amenities */}
                        {listing.amenities?.length > 0 && (
                            <div className="mb-4">
                                <h5 className="fw-bold mb-2">Tiện ích</h5>
                                <div className="d-flex flex-wrap gap-2">
                                    {listing.amenities.map((a) => (
                                        <span className="badge text-bg-light border" key={a.id}>
                                            {a.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {listing.description && (
                            <div className="mb-4">
                                <h5 className="fw-bold mb-2">Mô tả</h5>
                                <p className="text-body prose mb-0" style={{ whiteSpace: "pre-wrap" }}>
                                    {listing.description}
                                </p>
                            </div>
                        )}

                        {/* Location map (display only) */}
                        {listing.latitude != null && (
                            <div className="mb-4">
                                <h5 className="fw-bold mb-2">Vị trí trên bản đồ</h5>
                                <CoordinatePicker
                                    lat={listing.latitude}
                                    lng={listing.longitude}
                                    readOnly
                                    height={260}
                                />
                                <p className="small text-secondary mt-1 mb-0">
                                    <i className="bi bi-geo me-1" />
                                    Vị trí hiển thị gần đúng, địa chỉ chính xác:
                                    {" "}{listing.address}
                                    {listing.ward ? `, ${listing.ward.name}` : ""}
                                </p>
                            </div>
                        )}

                        {/* Ratings block */}
                        {listing.ratings && (
                            <div className="row g-3 mb-4">
                                {[
                                    ["listing_avg", "Tin đăng"],
                                    ["landlord_avg", "Chủ nhà"],
                                    ["area_avg", "Khu vực"],
                                ].map(([key, label]) => (
                                    <div className="col-4" key={key}>
                                        <div className="border rounded-3 p-3 text-center h-100">
                                            <div className="fw-bold fs-5">
                                                {listing.ratings[key] != null ? (
                                                    <>
                                                        <i className="bi bi-star-fill text-warning me-1" />
                                                        {listing.ratings[key]}
                                                    </>
                                                ) : (
                                                    "-"
                                                )}
                                            </div>
                                            <div className="small text-secondary">{label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI price advice */}
                        <PriceAdvicePanel listingId={listing.id} isStudent={isStudent} />

                        {/* Reviews */}
                        <h5 className="fw-bold mb-3">Đánh giá ({listing.reviews_count})</h5>

                        {isStudent && listing.can_review && (
                            <ReviewForm onSubmit={submitReview} busy={reviewBusy} />
                        )}

                        <ReviewList reviews={reviews} meta={reviewMeta} onPage={loadReviews} />
                    </div>

                    {/* RIGHT: landlord + action */}
                    <div className="col-lg-4">
                        <div className="card sticky-top" style={{ top: "1rem" }}>
                            <div className="card-body">
                                <div className="d-flex align-items-center mb-3">
                                    <i
                                        className="bi bi-person-circle fs-1 me-3"
                                        style={{ color: "var(--ink)" }}
                                    />
                                    <div>
                                        <strong>{listing.landlord?.name}</strong>
                                        <div className="small text-secondary">Chủ nhà</div>
                                    </div>
                                </div>

                                {listing.landlord?.phone ? (
                                    <p className="small mb-3">
                                        <i className="bi bi-telephone me-2" />
                                        {listing.landlord.phone}
                                    </p>
                                ) : (
                                    <p className="small text-secondary mb-3">
                                        Đăng nhập để xem số điện thoại.
                                    </p>
                                )}

                                {isStudent && (
                                    <button
                                        className="btn btn-primary w-100 mb-2"
                                        onClick={handleChat}
                                        disabled={chatBusy}
                                    >
                                        <i className="bi bi-chat-dots me-2" />
                                        {chatBusy
                                            ? "Đang mở..."
                                            : listing.my_conversation_id
                                              ? "Mở hội thoại"
                                              : "Nhắn tin cho chủ nhà"}
                                    </button>
                                )}
                                {!user && (
                                    <Link to="/login" className="btn btn-primary w-100 mb-2">
                                        Đăng nhập để nhắn tin
                                    </Link>
                                )}

                                {listing.distance_km != null && (
                                    <p className="small text-secondary mb-0">
                                        <i className="bi bi-geo me-2" />
                                        Cách trường {listing.distance_km} km
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
