/**
 * Nội dung cột minh họa (trái) của trang xác thực, dùng cùng AuthLayout:
 * heading, đoạn giới thiệu và các auth-point (icon + mô tả).
 */
export default function AuthVisual({
  heading,
  blurb,
  points,
}: {
  heading: React.ReactNode;
  blurb: React.ReactNode;
  points: [string, string][];
}) {
    return (
        <div className="auth-visual-body">
            <h2 className="mb-3">{heading}</h2>
            <p className="auth-visual-blurb mb-4">{blurb}</p>
            <div className="d-flex flex-column gap-2">
                {points.map(([icon, text]: [string, string]) => (
                    <div className="auth-point" key={icon}>
                        <i className={`bi bi-${icon}`} />
                        <span>{text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
