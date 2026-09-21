import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getListings } from "../../api/listingApi";
import ListingCard from "../../components/ListingCard";
import "../../styles/home.css";

export default function Home() {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getListings({ per_page: 6, sort: "newest" })
            .then(({ data }) => setListings(data))
            .catch(() => setError("Không tải được danh sách phòng."))
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            {/* HERO */}
            <section className="hero-section py-5 text-center">
                <div className="container">
                    <h1 className="display-5 fw-bold mb-3">
                        Tìm nơi ở phù hợp, <span style={{ color: "var(--brand)" }}>gần trường</span>{" "}
                        và đúng ngân sách.
                    </h1>
                    <p className="lead text-secondary mb-4">
                        Tìm phòng trọ, khám phá khu vực phù hợp và kết nối trực tiếp với chủ trọ.
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                        <Link to="/rooms" className="btn btn-primary btn-lg px-4">
                            Tìm phòng trọ
                        </Link>
                        <Link to="/ai/chat" className="btn btn-outline-secondary btn-lg px-4">
                            <i className="bi bi-robot me-1" /> Hỏi trợ lý AI
                        </Link>
                    </div>
                </div>
            </section>

            {/* FEATURED LISTINGS */}
            <section className="py-5">
                <div className="container">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="fw-bold mb-0">Phòng trọ mới nhất</h2>
                        <Link to="/rooms" className="btn btn-outline-primary btn-sm">
                            Xem tất cả
                        </Link>
                    </div>

                    {loading && (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status" />
                        </div>
                    )}

                    {error && <div className="alert alert-warning">{error}</div>}

                    <div className="row g-4">
                        {listings.map((l) => (
                            <div className="col-lg-4 col-md-6" key={l.id}>
                                <ListingCard listing={l} />
                            </div>
                        ))}
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
                                    className="d-block h-100 p-4 bg-white rounded-3 border text-decoration-none text-body"
                                >
                                    <i className={`bi bi-${icon} fs-2 mb-2`} style={{ color: "var(--brand)" }} />
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
                        Gợi ý tham khảo do AI tạo ra — hoàn toàn miễn phí.
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
                                    className="d-block h-100 p-4 bg-white rounded-3 border text-decoration-none text-body"
                                >
                                    <i className={`bi bi-${icon} fs-2 mb-2`} style={{ color: "var(--brand)" }} />
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
