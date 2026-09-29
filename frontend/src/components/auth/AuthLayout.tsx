import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

/**
 * Khung trang xác thực dùng chung cho Login/Register (debt #2 trong
 * docs/TECH-DEBT.md): auth-split (visual + card), header TROSV, tiêu đề,
 * alert lỗi chuỗi (nếu có) và footer. Nội dung form là `children`; phần
 * minh họa bên trái dựng bằng AuthVisual (file riêng - react-refresh).
 * Độ rộng card cố định ở .auth-card trong auth.css - hai trang luôn cùng
 * kích thước vì width không phải prop mỗi page tự đặt.
 */
export default function AuthLayout({
    title,
    visual,
    error = "",
    footer,
    children,
}: {
    title: string;
    visual: React.ReactNode;
    error?: string;
    footer?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="auth-page">
            <div className="auth-split">
                {/* Visual pane (decorative) */}
                <aside className="auth-visual d-none d-lg-flex" aria-hidden="true">
                    {visual}
                </aside>

                {/* Form pane */}
                <div className="auth-page-mobile d-flex align-items-center justify-content-center">
                    <div className="w-100">
                        <div className="auth-card">
                            <div className="text-center mb-3">
                                <Link to={ROUTES.HOME} className="auth-logo-link">
                                    TROSV
                                </Link>
                                <p className="text-secondary small mb-0">
                                    Nền tảng tìm trọ dành cho sinh viên
                                </p>
                            </div>

                            <h1 className="auth-title text-center">{title}</h1>

                            {error && (
                                <div className="alert alert-danger py-2 small">
                                    {error}
                                </div>
                            )}

                            {children}

                            {footer}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
