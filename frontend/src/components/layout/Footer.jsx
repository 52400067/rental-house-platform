import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="border-top mt-5 py-4 bg-light">
            <div className="container">
                <div className="row g-4">
                    <div className="col-lg-4">
                        <h5 className="fw-bold" style={{ color: "var(--brand)" }}>
                            <i className="bi bi-house-heart-fill me-1" />
                            TroTot
                        </h5>
                        <p className="small text-secondary mb-0">
                            Nền tảng tìm kiếm và đăng phòng trọ dành cho sinh viên
                            và chủ nhà.
                        </p>
                    </div>

                    <div className="col-lg-2 col-md-4">
                        <h6 className="fw-bold">Khám phá</h6>
                        <ul className="list-unstyled small">
                            <li>
                                <Link to="/" className="text-decoration-none">
                                    Trang chủ
                                </Link>
                            </li>
                            <li>
                                <Link to="/rooms" className="text-decoration-none">
                                    Tìm trọ
                                </Link>
                            </li>
                            <li>
                                <Link to="/map" className="text-decoration-none">
                                    Bản đồ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="col-lg-3 col-md-4">
                        <h6 className="fw-bold">Sinh viên</h6>
                        <ul className="list-unstyled small">
                            <li>
                                <Link to="/favorites" className="text-decoration-none">
                                    Phòng yêu thích
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/ai/roommates"
                                    className="text-decoration-none"
                                >
                                    Tìm bạn cùng phòng
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/ai/area-suggestions"
                                    className="text-decoration-none"
                                >
                                    Gợi ý khu vực
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="col-lg-3 col-md-4">
                        <h6 className="fw-bold">Chủ trọ</h6>
                        <ul className="list-unstyled small">
                            <li>
                                <Link to="/landlord" className="text-decoration-none">
                                    Quản lý tin đăng
                                </Link>
                            </li>
                            <li>
                                <Link to="/landlord/new" className="text-decoration-none">
                                    Đăng tin mới
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <hr />                    <p className="small text-secondary text-center mb-0">
                        © 2026 TroTot. Bảo lưu mọi quyền.
                    </p>
            </div>
        </footer>
    );
}
