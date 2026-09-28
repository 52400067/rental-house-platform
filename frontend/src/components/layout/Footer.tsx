import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

export default function Footer() {
    return (
        <footer className="footer mt-5 py-5">
            <div className="container">
                <div className="row g-4">
                    <div className="col-lg-4">
                        <h5 className="footer-brand fw-bold mb-2">
                            <i
                                className="bi bi-house-heart-fill me-1"
                                style={{ color: "var(--brand-soft)" }}
                            />
                            TROSV
                        </h5>
                        <p className="small mb-0" style={{ color: "#b5bcd2" }}>
                            Nền tảng tìm kiếm và đăng phòng trọ dành cho sinh viên
                            và chủ nhà.
                        </p>
                    </div>

                    <div className="col-lg-2 col-md-4">
                        <h6 className="fw-bold">Khám phá</h6>
                        <ul className="list-unstyled small">
                            <li>
                                <Link to={ROUTES.HOME} className="text-decoration-none">
                                    Trang chủ
                                </Link>
                            </li>
                            <li>
                                <Link to={ROUTES.ROOMS} className="text-decoration-none">
                                    Tìm trọ
                                </Link>
                            </li>
                            <li>
                                <Link to={ROUTES.MAP} className="text-decoration-none">
                                    Bản đồ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="col-lg-3 col-md-4">
                        <h6 className="fw-bold">Sinh viên</h6>
                        <ul className="list-unstyled small">
                            <li>
                                <Link to={ROUTES.FAVORITES} className="text-decoration-none">
                                    Phòng yêu thích
                                </Link>
                            </li>
                            <li>
                                <Link to={ROUTES.AI_ROOMMATES} className="text-decoration-none">
                                    Tìm bạn cùng phòng
                                </Link>
                            </li>
                            <li>
                                <Link to={ROUTES.AI_AREA_SUGGESTIONS} className="text-decoration-none">
                                    Gợi ý khu vực
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="col-lg-3 col-md-4">
                        <h6 className="fw-bold">Chủ trọ</h6>
                        <ul className="list-unstyled small">
                            <li>
                                <Link to={ROUTES.LANDLORD} className="text-decoration-none">
                                    Quản lý tin đăng
                                </Link>
                            </li>
                            <li>
                                <Link to={ROUTES.LANDLORD_NEW} className="text-decoration-none">
                                    Đăng tin mới
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <hr />
                <p className="small text-center mb-0" style={{ color: "#8d94a8" }}>
                    © 2026 TROSV. Bảo lưu mọi quyền.
                </p>
            </div>
        </footer>
    );
}
