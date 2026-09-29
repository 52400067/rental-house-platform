/**
 * Nội dung cột minh họa (trái) của trang xác thực, dùng cùng AuthLayout:
 * eyebrow tag, heading (dùng <em> để highlight từ khoá bằng lime),
 * đoạn giới thiệu, các auth-point (icon badge lime + mô tả) và dải số liệu
 * .auth-visual-stats (đếm phẳng từ props.stats).
 */
export default function AuthVisual({
  eyebrow,
  heading,
  blurb,
  points,
  stats,
}: {
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  blurb: React.ReactNode;
  points: [string, string][];
  /** Dải số liệu nền tảng (số + nhãn) dưới cùng - lấp vùng trống dưới points. */
  stats?: [string, string][];
}) {
    return (
        <div className="auth-visual-body">
            {eyebrow && (
                <div className="auth-visual-eyebrow">{eyebrow}</div>
            )}
            <h2 className="mb-3">{heading}</h2>
            <p className="auth-visual-blurb">{blurb}</p>
            <div className="d-flex flex-column gap-2">
                {points.map(([icon, text]: [string, string]) => (
                    <div className="auth-point" key={icon}>
                        <span className="auth-point-icon">
                            <i className={`bi bi-${icon}`} />
                        </span>
                        <span>{text}</span>
                    </div>
                ))}
            </div>
            {stats && stats.length > 0 && (
                <div className="auth-visual-stats">
                    {stats.map(([num, label]: [string, string]) => (
                        <div className="auth-visual-stat" key={label}>
                            <strong>{num}</strong>
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
