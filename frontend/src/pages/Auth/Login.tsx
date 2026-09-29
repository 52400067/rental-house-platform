import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errMessage } from "../../api/axiosClient";
import { ROUTES } from "../../constants/routes";
import { useAuthForm } from "../../hooks/useAuthForm";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthVisual from "../../components/auth/AuthVisual";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const { busy, handleSubmit } = useAuthForm({
        submit: async () => {
            setError("");
            await login(email, password);
        },
        onError: (err) => setError(errMessage(err, "Đăng nhập thất bại.")),
        // Quay lại trang bị chặn trước đó (ProtectedRoute ghi trong state.from).
        afterSuccess: () => navigate(location.state?.from || ROUTES.HOME, { replace: true }),
    });

    return (
        <AuthLayout
            title="Đăng nhập"
            subtitle="Chào mừng trở lại - tiếp tục tìm phòng phù hợp cho bạn."
            error={error}
        visual={
                <AuthVisual
                    eyebrow="Thuê trọ dành cho sinh viên"
                    heading={
                        <>
                            Sổ tay thuê trọ{" "}
                            <em className="auth-visual-em">của bạn.</em>
                        </>
                    }
                    blurb={
                        <>
                            Ghi lại phòng ưng ý, hỏi chủ trọ trực tiếp, nhận gợi ý
                            phù hợp - tất cả trong một nơi.
                        </>
                    }
                    points={[
                        ["geo-alt", "Tin đăng kèm khoảng cách tới trường của bạn"],
                        ["chat-dots", "Nhắn tin trực tiếp với chủ trọ, không qua trung gian"],
                        ["robot", "Gợi ý khu vực và bạn cùng phòng do AI tham khảo"],
                    ]}
                    stats={[
                        ["168", "Phường ở TP.HCM"],
                        ["20", "Trường ĐH, CĐ"],
                        ["30+", "Phòng đang mở"],
                    ]}
                />
            }
            footer={
                <span>
                    Chưa có tài khoản? <Link to={ROUTES.REGISTER}>Đăng ký ngay</Link>
                </span>
            }
        >
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="login-email" className="form-label">
                        Email
                    </label>
                    <input
                        type="email"
                        id="login-email"
                        className="form-control"
                        placeholder="nhap@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="login-password" className="form-label">
                        Mật khẩu
                    </label>
                    <div className="input-group">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="login-password"
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
                            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                            <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"} />
                        </button>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={busy}>
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

            <div className="auth-demo-note mt-4 mb-0">
                <div className="auth-demo-note-title">
                    <i className="bi bi-lightning-charge-fill me-1" />
                    Tài khoản demo
                </div>
                <div className="auth-demo-note-row">
                    <span>Sinh viên</span>
                    <code>student1@example.com</code>
                </div>
                <div className="auth-demo-note-row">
                    <span>Chủ nhà</span>
                    <code>landlord1@example.com</code>
                </div>
                <div className="auth-demo-note-hint">
                    Mật khẩu chung: <code>password</code>
                </div>
            </div>
        </AuthLayout>
    );
}
