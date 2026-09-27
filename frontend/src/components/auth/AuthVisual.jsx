/**
 * Nội dung cột minh họa (trái) của trang xác thực, dùng cùng AuthLayout:
 * heading, đoạn giới thiệu và các auth-point (icon + mô tả).
 */
export default function AuthVisual({ heading, blurb, points }) {
    return (
        <>
            <h2 className="mb-2">{heading}</h2>
            <p className="mb-4" style={{ color: "#b5bcd2", maxWidth: 420 }}>
                {blurb}
            </p>
            <div className="d-flex flex-column gap-2" style={{ maxWidth: 420 }}>
                {points.map(([icon, text]) => (
                    <div className="auth-point" key={icon}>
                        <i className={`bi bi-${icon}`} />
                        <span>{text}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
