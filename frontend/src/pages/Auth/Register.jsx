import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errMessage } from "../../api/axiosClient";
import "../../styles/auth.css";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        role: "",
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setBusy(true);
        try {
            await register(form);
            navigate("/", { replace: true });
        } catch (err) {
            setErrors(err.response?.data?.errors || {});
            if (!err.response?.data?.errors) {
                setErrors({
                    email: [errMessage(err, "Đăng ký thất bại. Vui lòng thử lại.")],
                });
            }
        } finally {
            setBusy(false);
        }
    }

    const fieldError = (key) =>
        errors[key] && (
            <div className="small text-danger mt-1">{errors[key][0]}</div>
        );

    return (
        <div className="auth-page">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-lg-6 col-md-8">
                        <div className="auth-card">
                            <div className="text-center mb-3">
                                <Link to="/" className="auth-logo-link">
                                    TroO
                                </Link>
                                <p className="text-secondary small mb-0">
                                    Nền tảng tìm trọ dành cho sinh viên
                                </p>
                            </div>

                            <h1 className="auth-title text-center">Tạo tài khoản</h1>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Họ và tên</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                                        value={form.name}
                                        onChange={set("name")}
                                        required
                                    />
                                    {fieldError("name")}
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className={`form-control ${errors.email ? "is-invalid" : ""}`}
                                        value={form.email}
                                        onChange={set("email")}
                                        required
                                    />
                                    {fieldError("email")}
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Mật khẩu</label>
                                        <input
                                            type="password"
                                            className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                            value={form.password}
                                            onChange={set("password")}
                                            minLength={8}
                                            required
                                        />
                                        {fieldError("password")}
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            Xác nhận mật khẩu
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={form.password_confirmation}
                                            onChange={set("password_confirmation")}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Loại tài khoản</label>
                                    <div className="d-flex gap-2">
                                        {[
                                            ["student", "Sinh viên", "mortarboard"],
                                            ["landlord", "Chủ trọ", "house"],
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

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={busy}
                                >
                                    {busy ? "Đang đăng ký..." : "Đăng ký"}
                                </button>
                            </form>

                            <div className="text-center mt-3 small">
                                <span className="text-secondary">Đã có tài khoản? </span>
                                <Link to="/login">Đăng nhập</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
