import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errMessage } from "../../api/axiosClient";
import { formatVnd } from "../../api/format.js";
import { startDirectConversation } from "../../api/socialApi";
import { useAuth } from "../../context/AuthContext";
import { hobbyLabels } from "../../constants/hobbies.js";

const SLEEP_LABELS = {
    early: "Ngủ sớm",
    normal: "Bình thường",
    late: "Ngủ muộn",
};
const PERSONALITY_LABELS = {
    introvert: "Hướng nội",
    ambivert: "Trung tính",
    extrovert: "Hướng ngoại",
};
const CLEANLINESS_LABELS = {
    1: "Rất lộn xộn",
    2: "Thỉnh thoảng dọn",
    3: "Bình thường",
    4: "Sạch sẽ",
    5: "Cực kỳ gọn gàng",
};

export default function StudentPublic() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: me } = useAuth();
    const [student, setStudent] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.get(`/users/${id}`)
            .then((r) => setStudent(r.data.data))
            .catch((err) => setError(errMessage(err)));
    }, [id]);

    if (error) {
        return (
            <div className="container py-5" style={{ maxWidth: 720 }}>
                <div className="alert alert-warning">{error}</div>
            </div>
        );
    }
    if (!student) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border" role="status" />
            </div>
        );
    }

    const interests = hobbyLabels((student.interests || []).join(","));

    // Chỉ sinh viên khác mới thấy nút nhắn tin (chủ nhà và chính hồ sơ không).
    const canMessage = me && me.role === "student" && me.id !== student.id;

    async function handleMessage() {
        setBusy(true);
        setError("");
        try {
            const conversation = await startDirectConversation(student.id);
            navigate(`/messages/${conversation.id}`);
        } catch (err) {
            setError(errMessage(err));
        } finally {
            setBusy(false);
        }
    }
    const lifestyle = [
        ["Thói quen ngủ", SLEEP_LABELS[student.sleep_schedule]],
        ["Tính cách", PERSONALITY_LABELS[student.personality]],
        ["Độ sạch sẽ", CLEANLINESS_LABELS[student.cleanliness]],
        ["Hút thuốc", student.smoking === null ? null : student.smoking ? "Có" : "Không"],
        [
            "Ngân sách",
            student.budget_min !== null || student.budget_max !== null
                ? `${formatVnd(student.budget_min)} - ${formatVnd(student.budget_max)}`
                : null,
        ],
    ].filter(([, v]) => v !== null && v !== undefined);

    return (
        <div className="py-4">
            <div className="container" style={{ maxWidth: 720 }}>
                <div className="card">
                    <div className="card-body">
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div
                                className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                style={{
                                    width: 64,
                                    height: 64,
                                    fontSize: "1.5rem",
                                    backgroundColor: "var(--brand)",
                                }}
                            >
                                {(student.name || "?").charAt(0)}
                            </div>
                            <div>
                                <h1 className="h4 fw-bold mb-1">{student.name}</h1>
                                <div className="text-secondary small">
                                    {student.school || "Không rõ trường"}
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    {student.looking_for_roommate && (
                                        <span className="badge text-bg-success">
                                            Đang tìm bạn cùng phòng
                                        </span>
                                    )}
                                    {canMessage && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={busy}
                                            onClick={handleMessage}
                                        >
                                            {busy ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-1" />
                                                    Đang mở...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-chat-dots me-1" />
                                                    Nhắn tin
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {student.bio && <p className="mb-3">{student.bio}</p>}

                        <h2 className="h6 fw-semibold mb-2">Sở thích</h2>
                        {interests.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 mb-3">
                                {interests.map((label) => (
                                    <span
                                        key={label}
                                        className="badge rounded-pill"
                                        style={{
                                            backgroundColor: "var(--bs-secondary-bg)",
                                            color: "var(--bs-secondary-color)",
                                        }}
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-secondary small mb-3">
                                Chưa chia sẻ sở thích.
                            </p>
                        )}

                        {lifestyle.length > 0 && (
                            <>
                                <h2 className="h6 fw-semibold mb-2">Lối sống</h2>
                                <div className="row g-2 mb-2">
                                    {lifestyle.map(([k, v]) => (
                                        <div className="col-6 col-md-4" key={k}>
                                            <div className="border rounded p-2 h-100">
                                                <div className="text-secondary small">{k}</div>
                                                <div className="small fw-semibold">{v}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
