import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errMessage } from "../../api/axiosClient";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            await login(email, password);
            navigate(location.state?.from || "/", { replace: true });
        } catch (err) {
            setError(errMessage(err, "Đăng nhập thất bại."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-split">
                {/* Visual pane (decorative) */}
                <aside className="auth-visual d-none d-lg-flex" aria-hidden="true">
                    <h2 className="mb-2">
                        Sổ tay thuê trọ<br />
                        của bạn.
                    </h2>
                    <p className="mb-4" style={{ color: "#b5bcd2", maxWidth: 420 }}>
                        Ghi lại phòng ưng ý, hỏi chủ trọ trực tiếp, nhận gợi ý
                        phù hợp — tất cả trong một nơi.
                    </p>
                    <div className="d-flex flex-column gap-2" style={{ maxWidth: 420 }}>
                        <div className="auth-point">
                            <i className="bi bi-geo-alt" />
                            <span>Tin đăng kèm khoảng cách tới trường của bạn</span>
                        </div>
                        <div className="auth-point">
                            <i className="bi bi-chat-dots" />
                            <span>Nhắn tin trực tiếp với chủ trọ, không qua trung gian</span>
                        </div>
                        <div className="auth-point">
                            <i className="bi bi-robot" />
                            <span>Gợi ý khu vực và bạn cùng phòng do AI tham khảo</span>
                        </div>
                    </div>
                </aside>

                {/* Form pane */}
                <div className="auth-page-mobile d-flex align-items-center justify-content-center">
                    <div className="w-100" style={{ maxWidth: 460 }}>
                        <div className="auth-card">
                            <div className="text-center mb-3">
                                <Link to="/" className="auth-logo-link">
                                    TroTot
                                </Link>
                                <p className="text-secondary small mb-0">
                                    Nền tảng tìm trọ dành cho sinh viên
                                </p>
                            </div>

                            <h1 className="auth-title text-center">Đăng nhập</h1>

                            {error && (
                                <div className="alert alert-danger py-2 small">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="form-control"
                                        placeholder="nhap@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">
                                        Mật khẩu
                                    </label>
                                    <div className="input-group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            className="form-control"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                            aria-label={
                                                showPassword
                                                    ? "Ẩn mật khẩu"
                                                    : "Hiện mật khẩu"
                                            }
                                        >
                                            <i
                                                className={
                                                    showPassword
                                                        ? "bi bi-eye-slash"
                                                        : "bi bi-eye"
                                                }
                                            />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={busy}
                                >
                                    {busy ? (
                                        <>
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                            />
                                            Đang đăng nhập...
                                        </>
                                    ) : (
                                        "Đăng nhập"
                                    )}
                                </button>
                            </form>

                            <div className="text-center mt-3 small">
                                <span className="text-secondary">
                                    Chưa có tài khoản?{" "}
                                </span>
                                <Link to="/register">Đăng ký ngay</Link>
                            </div>

                            <div className="alert alert-light small mt-4 mb-0">
                                <strong>Tài khoản demo</strong> (mật khẩu{" "}
                                <code>password</code>):
                                <div>student1@example.com - sinh viên</div>
                                <div>landlord1@example.com - chủ nhà</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
