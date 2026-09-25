import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import * as bootstrap from "bootstrap/dist/js/bootstrap.bundle.min.js";
import { useAuth } from "../../context/AuthContext";
import { getConversations } from "../../api/socialApi";
import { getEcho, disconnectEcho } from "../../api/echo";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [unread, setUnread] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    // Total unread badge = sum of unread_count from GET /conversations.
    // Initial fetch once, then realtime increments via the user's private
    // WebSocket channel (no more 15s polling).
    useEffect(() => {
        if (!user) {
            setUnread(0);
            disconnectEcho();
            return undefined;
        }
        let active = true;
        getConversations()
            .then((list) => {
                if (active) {
                    setUnread(
                        list.reduce((sum, c) => sum + (c.unread_count || 0), 0)
                    );
                }
            })
            .catch(() => {});

        const echo = getEcho();
        if (!echo) return () => { active = false; };

        const chan = echo.private(`App.Models.User.${user.id}`);
        chan.listen(".message.sent", (e) => {
            // Someone else's message = one unread for me.
            if (e.message?.sender_id !== user.id) {
                setUnread((u) => u + 1);
            }
        });
        chan.listen(".message.deleted", (e) => {
            // Unsend-for-everyone of an unread incoming message: badge down.
            if (
                e.removed &&
                e.deleted_for?.includes(user.id) &&
                e.sender_id &&
                e.sender_id !== user.id
            ) {
                setUnread((u) => Math.max(0, u - 1));
            }
        });

        return () => {
            active = false;
            echo.leave(`App.Models.User.${user.id}`);
        };
    }, [user]);

    // Elevation once the page scrolls (paper lifts off the ruled background).
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Close the mobile menu after navigating (Bootstrap keeps it open).
    useEffect(() => {
        if (window.innerWidth >= 992) return undefined;
        const el = document.getElementById("navbarContent");
        if (!el) return undefined;
        const inst = bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
        const hide = () => inst.hide();
        el.addEventListener("click", hide);
        return () => el.removeEventListener("click", hide);
    }, []);

    async function handleLogout() {
        await logout();
        navigate("/");
    }

    return (
        <nav
            className={`navbar navbar-expand-lg sticky-top${scrolled ? " is-scrolled" : ""}`}
        >
            <div className="container">
                <Link className="navbar-brand fw-bold" to="/">
                    <i className="bi bi-house-heart-fill me-1" style={{ color: "var(--brand)" }} />
                    TROSV
                </Link>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarContent"
                    aria-label="Mở menu điều hướng"
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
