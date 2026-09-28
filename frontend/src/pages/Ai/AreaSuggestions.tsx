import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { aiAreaSuggestions } from "../../api/aiApi";
import { getSchools } from "../../api/listingApi";
import { errMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import AiDisclaimer from "../../components/AiDisclaimer";
import { ROUTES } from "../../constants/routes";
import type { AiAreaSuggestion, School, User } from "../../types/api";

const PRIORITY_LABELS: Record<string, string> = {
  cheap: "Giá rẻ",
  near_school: "Gần trường",
  well_rated: "Đánh giá tốt",
  many_options: "Nhiều lựa chọn",
};

/** Fields ho so sinh vien dung cho form goi y khu vuc. */
interface StudentProfile {
  budget_min?: number | string | null;
  budget_max?: number | string | null;
  school_id?: number | string | null;
}

export default function AreaSuggestions() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [results, setResults] = useState<AiAreaSuggestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSchools().then(setSchools).catch(() => {});
  }, []);

  // Seed the budget/school inputs from the student profile once it is
  // available - during render via prev-comparison, no setState in effect.
  const [seededUser, setSeededUser] = useState<number | null | undefined>(undefined);
  if (user && seededUser !== user.id) {
    setSeededUser(user.id);
    const profile = user as User & StudentProfile;
    setBudgetMin(profile.budget_min != null ? String(profile.budget_min) : "");
    setBudgetMax(profile.budget_max != null ? String(profile.budget_max) : "");
    setSchoolId(profile.school_id != null ? String(profile.school_id) : "");
  }

  const isStudent = user?.role === "student";

  function togglePriority(p: string): void {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function find(): Promise<void> {
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
                  <label className="form-label small">Ngân sách từ</label>
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
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label small">Ưu tiên</label>
                <div className="d-flex flex-wrap gap-2">
                  {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`btn btn-sm ${
                        priorities.includes(key) ? "btn-primary" : "btn-outline-secondary"
                      }`}
                      onClick={() => togglePriority(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary w-100 mt-3"
                onClick={find}
                disabled={busy}
              >
                {busy ? "Đang phân tích..." : "Tìm khu vực phù hợp"}
              </button>
            </div>
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        {results && (
          <div>
            {results.length === 0 ? (
              <div className="alert alert-info">Chưa có gợi ý phù hợp - thử nới ngân sách.</div>
            ) : (
              results.map((r, i) => (
                <Link
                  key={`${r.city_id ?? i}`}
                  to={r.city_id ? `${ROUTES.ROOMS}?city_id=${r.city_id}` : ROUTES.ROOMS}
                  className="text-decoration-none"
                >
                  <div className="card mb-2">
                    <div className="card-body d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">{r.city_name || `Khu vực #${r.city_id}`}</div>
                        {r.reason && <div className="small text-secondary">{r.reason}</div>}
                      </div>
                      <i className="bi bi-chevron-right" />
                    </div>
                  </div>
                </Link>
              ))
            )}
            <AiDisclaimer />
          </div>
        )}
      </div>
    </div>
  );
}
