import { useState } from "react";
import { Link } from "react-router-dom";
import { aiRoommates } from "../../api/aiApi";
import { errMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import AiDisclaimer from "../../components/AiDisclaimer";
import { hobbyLabels, HOBBY_LABELS } from "../../constants/hobbies.js";

export default function Roommates() {
    const { user } = useAuth();
    const [results, setResults] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const isStudent = user?.role === "student";

    async function find() {
        setBusy(true);
        setError("");
        try {
            setResults(await aiRoommates());
        } catch (err) {
            setResults(null);
            setError(errMessage(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="py-4">
            <div className="container" style={{ maxWidth: 720 }}>
                <h1 className="h3 fw-bold mb-1">
                    <i className="bi bi-people me-2" />
                    Tìm bạn cùng phòng
                </h1>
                <p className="text-secondary small">
                    AI xếp hạng các sinh viên có thói quen sinh hoạt và ngân sách phù hợp với bạn.
                </p>

                {!isStudent && (
                    <div className="alert alert-warning">
                        Tính năng này dành cho tài khoản <strong>sinh viên</strong>.
                    </div>
                )}

                {isStudent && (
                    <button
                        className="btn btn-primary mb-4"
                        onClick={find}
                        disabled={busy}
                    >
                        {busy ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Đang tìm...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-stars me-2" />
                                Gợi ý cho tôi
                            </>
                        )}
                    </button>
                )}

                {error && (
                    <div className="alert alert-warning">
                        {error}
                        {error.includes("hồ sơ") && (
                            <div className="mt-1">
                                <Link to="/profile">Cập nhật hồ sơ →</Link>
                            </div>
                        )}
                    </div>
                )}

                {results && (
                    <>
                        {results.length === 0 ? (
                            <p className="text-secondary">
                                Chưa có ứng viên phù hợp. Hãy thử lại sau.
                            </p>
                        ) : (
                            <div className="list-group">
                                {results.map((r) => (
                                    <div
                                        key={r.user_id}
                                        className="list-group-item d-flex gap-3"
                                    >
                                        <div
                                            className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                            style={{
                                                width: 48,
                                                height: 48,
                                                backgroundColor: "var(--brand)",
                                            }}
                                        >
                                            {r.score}
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="d-flex justify-content-between">
                                                <strong>
                                                    <Link
                                                        to={`/students/${r.user_id}`}
                                                        className="text-decoration-none"
                                                    >
                                                        {r.name}
                                                    </Link>
                                                </strong>
                                                {r.phone && (
                                                    <a
                                                        href={`tel:${r.phone}`}
                                                        className="small"
                                                    >
                                                        <i className="bi bi-telephone me-1" />
                                                        {r.phone}
                                                    </a>
                                                )}
                                            </div>
                                            <div className="small text-secondary mb-1">
                                                {r.school || "Không rõ trường"}
                                            </div>
                                            {(r.interests?.length ?? 0) > 0 && (
                                                <div className="d-flex flex-wrap gap-1 mb-2">
                                                    {hobbyLabels(r.interests.join(",")).map(
                                                        (label) => {
                                                            const shared = (r.interests_shared ?? []).some(
                                                                (key) => (HOBBY_LABELS[key] || key) === label,
                                                            );
                                                            return (
                                                                <span
                                                                    key={label}
                                                                    className={`badge rounded-pill ${shared ? "text-bg-success" : ""}`}
                                                                    style={
                                                                        shared
                                                                            ? undefined
                                                                            : {
                                                                                  backgroundColor:
                                                                                      "var(--bs-secondary-bg)",
                                                                                  color: "var(--bs-secondary-color)",
                                                                              }
                                                                    }
                                                                >
                                                                    {label}
                                                                </span>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                            {(r.interests_shared?.length ?? 0) > 0 && (
                                                <p className="small text-success mb-2">
                                                    <i className="bi bi-hand-thumbs-up me-1" />
                                                    Trùng {r.interests_shared.length} sở thích với bạn
                                                </p>
                                            )}
                                            <p className="small mb-0">{r.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-3">
                            <AiDisclaimer />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
