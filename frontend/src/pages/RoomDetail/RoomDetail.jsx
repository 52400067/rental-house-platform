import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CoordinatePicker from "../../components/CoordinatePicker";
import {
    getListing,
    getListingReviews,
    createReview,
} from "../../api/listingApi";
import * as socialApi from "../../api/socialApi";
import { aiPriceAdvice } from "../../api/aiApi";
import {
    STATUS_BADGES,
    STATUS_LABELS,
    TYPE_LABELS,
    formatDateTime,
    formatVnd,
} from "../../api/format";
import { useAuth } from "../../context/AuthContext";
import { errMessage } from "../../api/axiosClient";
import AiDisclaimer from "../../components/AiDisclaimer";
import Pagination from "../../components/Pagination";

export default function RoomDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedImage, setSelectedImage] = useState(0);

    // Reviews
    const [reviews, setReviews] = useState([]);
    const [reviewMeta, setReviewMeta] = useState(null);

    // Review form
    const [reviewForm, setReviewForm] = useState({
        listing_rating: 5,
        landlord_rating: 5,
        comment: "",
    });
    const [reviewBusy, setReviewBusy] = useState(false);

    // AI price advice
    const [advice, setAdvice] = useState(null);
    const [adviceBusy, setAdviceBusy] = useState(false);
    const [adviceError, setAdviceError] = useState("");

    // Chat
    const [chatBusy, setChatBusy] = useState(false);

    const isStudent = user?.role === "student";
    const isOwner = user && listing && user.id === listing.landlord?.id;

    const loadReviews = useCallback(
        (page = 1) => {
            getListingReviews(id, page)
                .then(({ data, meta }) => {
                    setReviews(data);
                    setReviewMeta(meta);
                })
                .catch(() => {});
        },
        [id]
    );

    useEffect(() => {
        setLoading(true);
        setSelectedImage(0);
        setAdvice(null);
        getListing(id)
            .then((data) => {
                setListing(data);
                loadReviews(1);
            })
            .catch((err) =>
                setError(
                    err.response?.status === 404
                        ? "Phòng trọ không tồn tại hoặc đã bị ẩn."
                        : errMessage(err)
                )
            )
            .finally(() => setLoading(false));
    }, [id, loadReviews]);

    async function toggleFavorite() {
        if (!isStudent) return;
        try {
            if (listing.is_favorited) {
                await socialApi.removeFavorite(listing.id);
            } else {
                await socialApi.addFavorite(listing.id);
            }
            setListing((l) => ({ ...l, is_favorited: !l.is_favorited }));
        } catch (err) {
            alert(errMessage(err));
        }
    }

    async function handleChat() {
        setChatBusy(true);
        try {
            const conv = await socialApi.startConversation(listing.id);
            navigate(`/messages/${conv.id}`);
        } catch (err) {
            alert(errMessage(err));
        } finally {
            setChatBusy(false);
        }
    }

    async function handleAdvice() {
        setAdviceBusy(true);
        setAdviceError("");
        try {
            setAdvice(await aiPriceAdvice(listing.id));
        } catch (err) {
            setAdviceError(errMessage(err, "Không nhận được tư vấn lúc này."));
        } finally {
            setAdviceBusy(false);
        }
    }

    async function submitReview(e) {
        e.preventDefault();
        setReviewBusy(true);
        try {
            await createReview(listing.id, reviewForm);
            setListing((l) => ({ ...l, can_review: false }));
            loadReviews(1);
        } catch (err) {
            alert(errMessage(err));
        } finally {
            setReviewBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border" role="status" />
            </div>
        );
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
                        {/* Gallery */}
                        {images.length > 0 && (
                            <>
                                <img
                                    src={images[selectedImage].url}
                                    className="img-fluid rounded-3 w-100 mb-2"
                                    style={{ maxHeight: 460, objectFit: "cover" }}
                                    alt={listing.title}
                                />
                                {images.length > 1 && (
                                    <div className="d-flex flex-wrap gap-2 mb-4">
                                        {images.map((img, i) => (
                                            <img
                                                key={img.id}
                                                src={img.url}
                                                className={`rounded-2 ${i === selectedImage ? "border border-3" : ""}`}
                                                style={{
                                                    width: 72,
                                                    height: 56,
                                                    objectFit: "cover",
                                                    cursor: "pointer",
                                                    borderColor:
                                                        i === selectedImage
                                                            ? "var(--brand)"
                                                            : undefined,
                                                }}
                                                onClick={() => setSelectedImage(i)}
                                                alt=""
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

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
                                <div className="fw-bold fs-4" style={{ color: "var(--brand)" }}>
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
                                <p className="text-body mb-0" style={{ whiteSpace: "pre-wrap" }}>
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
                                                    "—"
                                                )}
                                            </div>
                                            <div className="small text-secondary">{label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI price advice */}
                        <div className="border rounded-3 p-3 mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h5 className="fw-bold mb-0">
                                    <i className="bi bi-cash-coin me-1" /> Giá này hợp lý không?
                                </h5>
                                {!advice && (
                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={handleAdvice}
                                        disabled={adviceBusy || !isStudent}
                                        title={
                                            isStudent
                                                ? "Gợi ý giá từ AI"
                                                : "Chỉ dành cho sinh viên"
                                        }
                                    >
                                        {adviceBusy ? "Đang phân tích..." : "Hỏi AI"}
                                    </button>
                                )}
                            </div>

                            {adviceError && (
                                <div className="alert alert-warning py-2 small mb-0">
                                    {adviceError}
                                </div>
                            )}

                            {advice && (
                                <div>
                                    <span
                                        className={`badge text-bg-${
                                            advice.verdict === "high"
                                                ? "danger"
                                                : advice.verdict === "low"
                                                  ? "success"
                                                  : "primary"
                                        } mb-2`}
                                    >
                                        {advice.verdict === "high"
                                            ? "Cao hơn thị trường"
                                            : advice.verdict === "low"
                                              ? "Rẻ hơn thị trường"
                                              : "Hợp lý"}
                                    </span>
                                    <p className="small mb-1">
                                        Giá tham khảo:{" "}
                                        <strong>
                                            {formatVnd(advice.fair_min)} – {formatVnd(advice.fair_max)}
                                        </strong>{" "}
                                        (dựa trên {advice.stats.count} tin tương tự, trung vị{" "}
                                        {formatVnd(advice.stats.median)})
                                    </p>
                                    {advice.tips?.length > 0 && (
                                        <ul className="small mb-2">
                                            {advice.tips.map((t, i) => (
                                                <li key={i}>{t}</li>
                                            ))}
                                        </ul>
                                    )}
                                    <div className="bg-light rounded-2 p-2 small mb-2">
                                        <strong>Mẫu tin nhắn gửi chủ nhà:</strong>
                                        <div className="fst-italic">"{advice.message}"</div>
                                    </div>
                                    <AiDisclaimer />
                                </div>
                            )}
                        </div>

                        {/* Reviews */}
                        <h5 className="fw-bold mb-3">Đánh giá ({listing.reviews_count})</h5>

                        {/* Review form */}
                        {isStudent && listing.can_review && (
                            <form className="border rounded-3 p-3 mb-4" onSubmit={submitReview}>
                                <strong className="d-block mb-2">Để lại đánh giá của bạn</strong>
                                <div className="row g-3 mb-2">
                                    <div className="col-6">
                                        <label className="form-label small">Điểm tin đăng</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={reviewForm.listing_rating}
                                            onChange={(e) =>
                                                setReviewForm({
                                                    ...reviewForm,
                                                    listing_rating: Number(e.target.value),
                                                })
                                            }
                                        >
                                            {[5, 4, 3, 2, 1].map((n) => (
                                                <option key={n} value={n}>
                                                    {"★".repeat(n)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small">Điểm chủ nhà</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={reviewForm.landlord_rating}
                                            onChange={(e) =>
                                                setReviewForm({
                                                    ...reviewForm,
                                                    landlord_rating: Number(e.target.value),
                                                })
                                            }
                                        >
                                            {[5, 4, 3, 2, 1].map((n) => (
                                                <option key={n} value={n}>
                                                    {"★".repeat(n)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <textarea
                                    className="form-control form-control-sm mb-2"
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Chia sẻ trải nghiệm của bạn (tùy chọn)"
                                    value={reviewForm.comment}
                                    onChange={(e) =>
                                        setReviewForm({ ...reviewForm, comment: e.target.value })
                                    }
                                />
                                <button className="btn btn-primary btn-sm" disabled={reviewBusy}>
                                    {reviewBusy ? "Đang gửi..." : "Gửi đánh giá"}
                                </button>
                            </form>
                        )}

                        {/* Review list */}
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
                                    {r.comment && <p className="small mb-0 mt-1">{r.comment}</p>}
                                </div>
                            ))
                        )}
                        <Pagination meta={reviewMeta} onPage={(p) => loadReviews(p)} />
                    </div>

                    {/* RIGHT: landlord + action */}
                    <div className="col-lg-4">
                        <div className="card sticky-top" style={{ top: "1rem" }}>
                            <div className="card-body">
                                <div className="d-flex align-items-center mb-3">
                                    <i
                                        className="bi bi-person-circle fs-1 me-3"
                                        style={{ color: "var(--brand)" }}
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
