import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getConversations } from "../../api/socialApi";
import "../../styles/navbar.css";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [unread, setUnread] = useState(0);
    const timerRef = useRef(null);

    // Total unread badge = sum of unread_count from GET /conversations.
    // Polls only while logged in; stops after unmount or logout.
    useEffect(() => {
        if (!user) {
            setUnread(0);
            return undefined;
        }
        let active = true;
        const poll = () =>
            getConversations()
                .then((list) => {
                    if (active) {
                        setUnread(
                            list.reduce((sum, c) => sum + (c.unread_count || 0), 0)
                        );
                    }
                })
                .catch(() => {});
        poll();
        timerRef.current = setInterval(poll, 15000);
        return () => {
            active = false;
            clearInterval(timerRef.current);
        };
    }, [user]);

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    return (
        <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
            <div className="container">
                <Link className="navbar-brand fw-bold" to="/">
                    <i className="bi bi-house-heart-fill me-1" style={{ color: "var(--brand)" }} />
                    TroO
                </Link>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarContent"
                >
                    <span className="navbar-toggler-icon" />
                </button>

                <div className="collapse navbar-collapse" id="navbarContent">
                    <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <NavLink end to="/" className="nav-link">
                                Trang chủ
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/rooms" className="nav-link">
                                Tìm trọ
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/map" className="nav-link">
                                Bản đồ
                            </NavLink>
                        </li>
                        {user?.role === "student" && (
                            <>
                                <li className="nav-item">
                                    <NavLink to="/favorites" className="nav-link">
                                        Yêu thích
                                    </NavLink>
                                </li>
                                <li className="nav-item">
                                    <NavLink to="/ai/roommates" className="nav-link">
                                        Bạn cùng phòng
                                    </NavLink>
                                </li>
                            </>
                        )}
                        {user?.role === "landlord" && (
                            <li className="nav-item">
                                <NavLink to="/landlord" className="nav-link">
                                    Tin đăng của tôi
                                </NavLink>
                            </li>
                        )}
                    </ul>

                    <div className="d-flex gap-2 align-items-center">
                        {user ? (
                            <>
                                <Link
                                    to="/messages"
                                    className="btn btn-outline-secondary btn-sm position-relative"
                                    title="Tin nhắn"
                                >
                                    <i className="bi bi-envelope" />
                                    {unread > 0 && (
                                        <span className="badge rounded-pill text-bg-danger position-absolute top-0 start-100 translate-middle">
                                            {unread > 99 ? "99+" : unread}
                                        </span>
                                    )}
                                </Link>

                                <div className="dropdown">
                                    <button
                                        className="btn btn-outline-primary btn-sm dropdown-toggle"
                                        data-bs-toggle="dropdown"
                                    >
                                        <i className="bi bi-person-circle me-1" />
                                        {user.name.split(" ").slice(-1)[0]}
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end">
                                        <li>
                                            <Link
                                                className="dropdown-item"
                                                to="/profile"
                                            >
                                                <i className="bi bi-gear me-2" />
                                                Hồ sơ
                                            </Link>
                                        </li>
                                        {user.role === "student" && (
                                            <>
                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/favorites"
                                                    >
                                                        <i className="bi bi-heart me-2" />
                                                        Phòng yêu thích
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        className="dropdown-item"
                                                        to="/ai/area-suggestions"
                                                    >
                                                        <i className="bi bi-geo-alt me-2" />
                                                        Gợi ý khu vực
                                                    </Link>
                                                </li>
                                            </>
                                        )}
                                        <li>
                                            <hr className="dropdown-divider" />
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item"
                                                onClick={handleLogout}
                                            >
                                                <i className="bi bi-box-arrow-right me-2" />
                                                Đăng xuất
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn-outline-primary btn-sm">
                                    Đăng nhập
                                </Link>
                                <Link to="/register" className="btn btn-primary btn-sm">
                                    Đăng ký
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
