import { useState } from "react";
import type { ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errMessage, errFieldErrors } from "../../api/axiosClient";
import { ROUTES } from "../../constants/routes";
import { useAuthForm } from "../../hooks/useAuthForm";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthVisual from "../../components/auth/AuthVisual";

export default function Register() {
    const { register } = useAuth();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        role: "",
    });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    // Login có toggle hiện/ẩn mật khẩu - Register giữ tương tự cho hai
    // trang nhất quán (cùng input-group, cùng icon).
    const [showPassword, setShowPassword] = useState(false);

    const set = (key: "name" | "email" | "password" | "password_confirmation" | "role") => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

    const { busy, handleSubmit } = useAuthForm({
        submit: async () => {
            setErrors({});
            await register(form);
        },
        onError: (err) => {
            const fieldErrors = errFieldErrors(err);
            setErrors(
                Object.keys(fieldErrors).length
                    ? fieldErrors
                    : {
                          email: [errMessage(err, "Đăng ký thất bại. Vui lòng thử lại.")],
                      },
            );
        },
    });

    const fieldError = (key: string) =>
        errors[key] && (
            <div className="small text-danger mt-1">{errors[key][0]}</div>
        );

    return (
        <AuthLayout
            title="Tạo tài khoản"
            visual={
                <AuthVisual
                    heading={
                        <>
                            Một trang<br />
                            cho sinh viên,<br />
                            một trang cho chủ trọ.
                        </>
                    }
                    blurb={
                        <>
                            Tạo tài khoản miễn phí để lưu phòng yêu thích, nhắn tin
                            với chủ trọ hoặc đăng tin cho thuê.
                        </>
                    }
                    points={[
                        ["mortarboard", "Sinh viên: lưu phòng, tìm bạn ở cùng, hỏi AI"],
                        ["house-add", "Chủ trọ: đăng tin, quản lý trạng thái, nhận tin nhắn"],
                    ]}
                />
            }
            footer={
                <div className="text-center mt-3 small">
                    <span className="text-secondary">Đã có tài khoản? </span>
                    <Link to={ROUTES.LOGIN}>Đăng nhập</Link>
                </div>
            }
        >
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label className="form-label" htmlFor="reg-name">Họ và tên</label>
                    <input
                        type="text"
                        id="reg-name"
                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                        value={form.name}
                        onChange={set("name")}
                        required
                    />
                    {fieldError("name")}
                </div>

                <div className="mb-3">
                    <label className="form-label" htmlFor="reg-email">Email</label>
                    <input
                        type="email"
                        id="reg-email"
                        className={`form-control ${errors.email ? "is-invalid" : ""}`}
                        value={form.email}
                        onChange={set("email")}
                        required
                    />
                    {fieldError("email")}
                </div>

                <div className="row">
                    <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="reg-password">Mật khẩu</label>
                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="reg-password"
                                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                value={form.password}
                                onChange={set("password")}
                                minLength={8}
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
                        {fieldError("password")}
                    </div>
                    <div className="col-md-6 mb-3">
                        <label className="form-label" htmlFor="reg-password-confirmation">Xác nhận mật khẩu</label>
                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="reg-password-confirmation"
                                className="form-control"
                                value={form.password_confirmation}
                                onChange={set("password_confirmation")}
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
                </div>

                <div className="mb-3">
                    <label className="form-label">Loại tài khoản</label>
                    <div className="d-flex gap-2">
                        {[
                            ["student", "Sinh viên", "mortarboard"],
                            ["landlord", "Chủ trọ", "house-add"],
                        ].map(([value, label, icon]) => (
                            <label
                                key={value}
                                className={`btn btn-outline-primary flex-fill ${
                                    form.role === value ? "active" : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    className="d-none"
                                    name="role"
                                    value={value}
                                    checked={form.role === value}
                                    onChange={set("role")}
                                />
                                <i className={`bi bi-${icon} me-1`} />
                                {label}
                            </label>
                        ))}
                    </div>
                    {fieldError("role")}
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={busy}>
                    {busy ? "Đang đăng ký..." : "Đăng ký"}
                </button>
            </form>
        </AuthLayout>
    );
}
