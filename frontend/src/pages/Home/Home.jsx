import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getListings } from "../../api/listingApi";
import ListingCard from "../../components/ListingCard";
import ListingGridSkeleton from "../../components/ui/ListingGridSkeleton";
import "../../styles/home.css";

export default function Home() {
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [q, setQ] = useState("");

    useEffect(() => {
        getListings({ per_page: 6, sort: "newest" })
            .then(({ data }) => setListings(data))
            .catch(() => setError("Không tải được danh sách phòng."))
            .finally(() => setLoading(false));
    }, []);

    function submitSearch(e) {
        e.preventDefault();
        navigate(q.trim() ? `/rooms?q=${encodeURIComponent(q.trim())}` : "/rooms");
    }

    return (
        <>
            {/* HERO — the noticeboard */}
            <section className="hero-section">
                <div className="container position-relative">
                    <div className="text-center mx-auto" style={{ maxWidth: 720 }}>
                        <span className="eyebrow mb-3">
                            <i className="bi bi-geo-alt-fill" />
                            Dành cho sinh viên toàn quốc
                        </span>
                        <h1 className="display-5 fw-bold mb-3 hero-title mt-3">
                            Ghi lại phòng ưng ý,{" "}
                            <span className="text-brand">gần trường</span> và
                            đúng ngân sách.
                        </h1>
                        <p className="lead prose text-secondary mb-4">
                            Tìm phòng trọ, khám phá khu vực phù hợp và kết nối
                            trực tiếp với chủ trọ.
                        </p>

                        {/* Search bar - d-flex instead of input-group so
                            Bootstrap's input-group radius resets don't apply.
                            Icon-only submit: the action is universal. */}
                        <form className="hero-search d-flex mb-4" onSubmit={submitSearch}>
                            <span className="input-group-text bg-white border-end-0 ps-3">
                                <i className="bi bi-search text-secondary" />
                            </span>
                            <input
                                type="search"
                                className="form-control border-start-0 flex-grow-1"
                                placeholder="Nhập khu vực, trường học hoặc tên đường..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                aria-label="Tìm phòng trọ"
                            />
                            <button
                                className="btn btn-primary btn-search-icon"
                                type="submit"
                                aria-label="Tìm kiếm"
                                title="Tìm kiếm"
                            >
                                <i className="bi bi-arrow-right" />
                            </button>
                        </form>

                        <div className="d-flex flex-wrap justify-content-center gap-2">
                            <span className="hero-chip">
                                <i className="bi bi-shield-check" /> Tin đăng được duyệt
                            </span>
                            <span className="hero-chip">
                                <i className="bi bi-lightning-charge" /> Nhắn tin trực tiếp
                            </span>
                            <span className="hero-chip">
                                <i className="bi bi-robot" /> Trợ lý AI miễn phí
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURED LISTINGS */}
            <section className="py-5">
                <div className="container">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="fw-bold mb-0 section-heading">Phòng trọ mới nhất</h2>
                        <Link to="/rooms" className="btn btn-outline-primary btn-sm">
                            Xem tất cả <i className="bi bi-arrow-right ms-1" />
                        </Link>
                    </div>

                    {error && <div className="alert alert-warning">{error}</div>}

                    <div className="row g-4">
                        {loading ? (
                            <ListingGridSkeleton count={6} />
                        ) : (
                            listings.map((l, i) => (
                                <div className="col-lg-4 col-md-6" key={l.id}>
                                    <ListingCard listing={l} isNew={i === 0} />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* PROPERTY TYPES */}
            <section className="py-5 bg-light">
                <div className="container">
                    <h2 className="fw-bold text-center mb-4">Bạn đang tìm gì?</h2>
                    <div className="row g-4">
                        {[
                            ["room", "house-door", "Phòng trọ", "Không gian ở phù hợp cho sinh viên."],
                            ["apartment", "building", "Căn hộ", "Tiện nghi, phù hợp ở một mình hoặc cùng bạn."],
                            ["house", "houses", "Nhà nguyên căn", "Không gian riêng cho nhóm bạn hoặc gia đình."],
                        ].map(([type, icon, label, desc]) => (
                            <div className="col-lg-4 col-md-6" key={type}>
                                <Link
                                    to={`/rooms?type=${type}`}
                                    className="feature-tile d-block h-100 p-4 text-decoration-none text-body"
                                >
                                    <span className="feature-tile-icon mb-3">
                                        <i className={`bi bi-${icon} fs-4`} />
                                    </span>
                                    <h5 className="fw-bold">{label}</h5>
                                    <p className="text-secondary mb-0">{desc}</p>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI FEATURES */}
            <section className="py-5">
                <div className="container">
                    <h2 className="fw-bold text-center mb-1">Tìm trọ thông minh hơn với AI</h2>
                    <p className="text-secondary text-center mb-4">
                        Gợi ý tham khảo do AI tạo ra - hoàn toàn miễn phí.
                    </p>
                    <div className="row g-4">
                        {[
                            ["ai/area-suggestions", "geo-alt", "Gợi ý khu vực", "AI phân tích trường học, ngân sách và ưu tiên để gợi ý khu vực phù hợp."],
                            ["ai/roommates", "people", "Tìm bạn cùng phòng", "Gợi ý người có thói quen sinh hoạt và sở thích phù hợp với bạn."],
                            ["ai/chat", "robot", "Trợ lý AI", "Hỏi về phòng trọ, khu vực, giá thuê và hợp đồng thuê."],
                        ].map(([to, icon, label, desc]) => (
                            <div className="col-lg-4 col-md-6" key={to}>
                                <Link
                                    to={`/${to}`}
                                    className="feature-tile d-block h-100 p-4 text-decoration-none text-body"
                                >
                                    <span className="feature-tile-icon mb-3">
                                        <i className={`bi bi-${icon} fs-4`} />
                                    </span>
                                    <h5 className="fw-bold">{label}</h5>
                                    <p className="text-secondary mb-0">{desc}</p>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
