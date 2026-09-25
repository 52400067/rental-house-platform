import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { aiAreaSuggestions } from "../../api/aiApi";
import { getSchools } from "../../api/listingApi";
import { formatVnd } from "../../api/format";
import { errMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import AiDisclaimer from "../../components/AiDisclaimer";

const PRIORITY_LABELS = {
    cheap: "Giá rẻ",
    near_school: "Gần trường",
    well_rated: "Đánh giá tốt",
    many_options: "Nhiều lựa chọn",
};

export default function AreaSuggestions() {
    const { user } = useAuth();
    const [schools, setSchools] = useState([]);
    const [budgetMin, setBudgetMin] = useState("");
    const [budgetMax, setBudgetMax] = useState("");
    const [schoolId, setSchoolId] = useState("");
    const [priorities, setPriorities] = useState([]);
    const [results, setResults] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getSchools().then(setSchools).catch(() => {});
    }, []);

    // Seed the budget/school inputs from the student profile once it is
    // available - during render via prev-comparison, no setState in effect.
    const [seededUser, setSeededUser] = useState(null);
    if (user && seededUser !== user) {
        setSeededUser(user);
        setBudgetMin(user.budget_min ?? "");
        setBudgetMax(user.budget_max ?? "");
        setSchoolId(user.school_id ?? "");
    }

    const isStudent = user?.role === "student";

    function togglePriority(p) {
        setPriorities((prev) =>
            prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
        );
    }

    async function find() {
        setBusy(true);
        setError("");
        try {
            setResults(
                await aiAreaSuggestions({
                    budget_min: budgetMin === "" ? undefined : Number(budgetMin),
                    budget_max: budgetMax === "" ? undefined : Number(budgetMax),
                    school_id: schoolId || undefined,
                    priorities,
                })
            );
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
                    <i className="bi bi-geo-alt me-2" />
                    Gợi ý khu vực
                </h1>
                <p className="text-secondary small">
                    AI phân tích giá, đánh giá và khoảng cách để gợi ý khu vực phù hợp với bạn.
                </p>

                {!isStudent && (
                    <div className="alert alert-warning">
                        Tính năng này dành cho tài khoản <strong>sinh viên</strong>.
                    </div>
                )}

                {isStudent && (
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label small">
                                        Ngân sách từ
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        value={budgetMin}
                                        onChange={(e) => setBudgetMin(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small">đến</label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        value={budgetMax}
                                        onChange={(e) => setBudgetMax(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small">Trường</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={schoolId}
                                        onChange={(e) => setSchoolId(e.target.value)}
                                    >
                                        <option value="">Chọn trường</option>
                                        {schools.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.city?.name ? `${s.name} - ${s.city.name}` : s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-3">
                                <label className="form-label small">Ưu tiên</label>
                                <div className="d-flex flex-wrap gap-2">
                                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                                        <button
                                            key={v}
                                            type="button"
                                            className={`btn btn-sm ${
                                                priorities.includes(v)
                                                    ? "btn-primary"
                                                    : "btn-outline-secondary"
                                            }`}
                                            onClick={() => togglePriority(v)}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary mt-3"
                                onClick={find}
                                disabled={busy}
                            >
                                {busy ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Đang phân tích...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-stars me-2" />
                                        Gợi ý khu vực
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {error && <div className="alert alert-warning">{error}</div>}

                {results && (
                    <>
                        {results.length === 0 ? (
                            <p className="text-secondary">
                                Không có khu vực phù hợp với ngân sách này.
                            </p>
                        ) : (
                            results.map((r) => (
                                <div className="border rounded-3 p-3 mb-3" key={r.ward_id}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <h5 className="fw-bold mb-0">{r.name}</h5>
                                        <Link
                                            to={`/rooms?ward_id=${r.ward_id}`}
                                            className="btn btn-outline-primary btn-sm"
                                        >
                                            Xem phòng
                                        </Link>
                                    </div>
                                    <p className="small mt-2 mb-2">{r.reason}</p>
                                    <div className="d-flex flex-wrap gap-3 small text-secondary">
                                        <span>
                                            <i className="bi bi-house-door me-1" />
                                            {r.stats.listings_count} tin đăng
                                        </span>
                                        <span>
                                            <i className="bi bi-cash me-1" />
                                            TB {formatVnd(r.stats.avg_price)}
                                        </span>
                                        {r.stats.avg_rating != null && (
                                            <span>
                                                <i className="bi bi-star-fill text-warning me-1" />
                                                {r.stats.avg_rating}
                                            </span>
                                        )}
                                        {r.stats.distance_to_school_km != null && (
                                            <span>
                                                <i className="bi bi-geo me-1" />
                                                {r.stats.distance_to_school_km} km tới
                                                trường
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <AiDisclaimer />
                    </>
                )}
            </div>
        </div>
    );
}
