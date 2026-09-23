import { useEffect, useState } from "react";
import { updateProfile } from "../../api/authApi";
import { getSchools } from "../../api/listingApi";
import { errMessage } from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { HOBBIES, HOBBY_LABELS } from "../../constants/hobbies.js";
import FormSkeleton from "../../components/ui/FormSkeleton";

const SLEEP = [
    ["", "Chọn..."],
    ["early", "Ngủ sớm"],
    ["normal", "Bình thường"],
    ["late", "Ngủ muộn"],
];
const PERSONALITY = [
    ["", "Chọn..."],
    ["introvert", "Hướng nội"],
    ["ambivert", "Trung tính"],
    ["extrovert", "Hướng ngoại"],
];
const CLEANLINESS = [
    [1, "Rất lộn xộn"],
    [2, "Thỉnh thoảng dọn"],
    [3, "Bình thường"],
    [4, "Sạch sẽ"],
    [5, "Cực kỳ gọn gàng"],
];

export default function Profile() {
    const { user, refreshUser } = useAuth();

    const [schools, setSchools] = useState([]);
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getSchools().then(setSchools).catch(() => {});
    }, []);

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || "",
                phone: user.phone || "",
                bio: user.bio || "",
                school_id: user.school_id || "",
                budget_min: user.budget_min ?? "",
                budget_max: user.budget_max ?? "",
                sleep_schedule: user.sleep_schedule || "",
                cleanliness: user.cleanliness ?? "",
                smoking: user.smoking ? "1" : "0",
                personality: user.personality || "",
                interests: user.interests || "",
                looking_for_roommate: user.looking_for_roommate ? "1" : "0",
            });
        }
    }, [user]);

    if (!form) {
        return (
            <div className="py-4">
                <div className="container" style={{ maxWidth: 720 }}>
                    <div className="skeleton mb-2" style={{ height: 26, width: 180 }} />
                    <div
                        className="skeleton mb-4"
                        style={{ height: 14, width: 220 }}
                    />
                    <FormSkeleton />
                </div>
            </div>
        );
    }

    const isStudent = user.role === "student";
    const set = (key) => (e) => {
        setSaved(false);
        setForm({ ...form, [key]: e.target.value });
    };

    const selectedHobbies = (form.interests || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    function toggleHobby(hobby) {
        setSaved(false);
        const next = selectedHobbies.includes(hobby)
            ? selectedHobbies.filter((h) => h !== hobby)
            : [...selectedHobbies, hobby];
        setForm({ ...form, interests: next.join(",") });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setBusy(true);
        setError("");
        setSaved(false);

        const payload = {
            name: form.name,
            phone: form.phone || null,
            bio: form.bio || null,
        };
        if (isStudent) {
            payload.school_id = form.school_id ? Number(form.school_id) : null;
            payload.budget_min = form.budget_min === "" ? null : Number(form.budget_min);
            payload.budget_max = form.budget_max === "" ? null : Number(form.budget_max);
            payload.sleep_schedule = form.sleep_schedule || null;
            payload.cleanliness =
                form.cleanliness === "" ? null : Number(form.cleanliness);
            payload.smoking = form.smoking === "1";
            payload.personality = form.personality || null;
            payload.interests = form.interests || null;
            payload.looking_for_roommate = form.looking_for_roommate === "1";
        }

        try {
            await updateProfile(payload);
            await refreshUser();
            setSaved(true);
        } catch (err) {
            setError(errMessage(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="py-4">
            <div className="container" style={{ maxWidth: 720 }}>
                <h1 className="h3 fw-bold mb-1">Hồ sơ cá nhân</h1>
                <p className="text-secondary small">
                    {user.email} ·{" "}
                    {isStudent ? "Sinh viên" : "Chủ nhà"}
                </p>

                {saved && (
                    <div className="alert alert-success py-2">Đã lưu thay đổi.</div>
                )}
                {error && <div className="alert alert-danger py-2">{error}</div>}

                <form onSubmit={handleSubmit} className="card">
                    <div className="card-body">
                        <h5 className="card-title mb-3">Thông tin chung</h5>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">Họ và tên</label>
                                <input
                                    className="form-control"
                                    value={form.name}
                                    onChange={set("name")}
                                    required
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Số điện thoại</label>
                                <input
                                    className="form-control"
                                    value={form.phone}
                                    onChange={set("phone")}
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label">Giới thiệu bản thân</label>
                                <textarea
                                    className="form-control"
                                    rows={2}
                                    maxLength={2000}
                                    value={form.bio}
                                    onChange={set("bio")}
                                />
                            </div>
                        </div>

                        {isStudent && (
                            <>
                                <hr className="my-4" />
                                <h5 className="card-title mb-3">Thông tin sinh viên</h5>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">Trường</label>
                                        <select
                                            className="form-select"
                                            value={form.school_id}
                                            onChange={set("school_id")}
                                        >
                                            <option value="">Chọn trường</option>
                                            {schools.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.city?.name ? `${s.name} - ${s.city.name}` : s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">
                                            Ngân sách từ (VND)
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min={0}
                                            value={form.budget_min}
                                            onChange={set("budget_min")}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">đến (VND)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min={0}
                                            value={form.budget_max}
                                            onChange={set("budget_max")}
                                        />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Thói quen ngủ</label>
                                        <select
                                            className="form-select"
                                            value={form.sleep_schedule}
                                            onChange={set("sleep_schedule")}
                                        >
                                            {SLEEP.map(([v, l]) => (
                                                <option key={v} value={v}>
                                                    {l}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Tính cách</label>
                                        <select
                                            className="form-select"
                                            value={form.personality}
                                            onChange={set("personality")}
                                        >
                                            {PERSONALITY.map(([v, l]) => (
                                                <option key={v} value={v}>
                                                    {l}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Độ gọn gàng</label>
                                        <select
                                            className="form-select"
                                            value={form.cleanliness}
                                            onChange={set("cleanliness")}
                                        >
                                            <option value="">Chọn...</option>
                                            {CLEANLINESS.map(([v, l]) => (
                                                <option key={v} value={v}>
                                                    {v} - {l}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Có hút thuốc?</label>
                                        <select
                                            className="form-select"
                                            value={form.smoking}
                                            onChange={set("smoking")}
                                        >
                                            <option value="0">Không</option>
                                            <option value="1">Có</option>
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">
                                            Sở thích
                                        </label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {HOBBIES.map((hobby) => {
                                                const active = selectedHobbies.includes(hobby);
                                                return (
                                                    <button
                                                        key={hobby}
                                                        type="button"
                                                        className={`btn btn-sm ${active ? "btn-primary" : "btn-outline-secondary"}`}
                                                        style={{ borderRadius: "2rem" }}
                                                        aria-pressed={active}
                                                        onClick={() => toggleHobby(hobby)}
                                                    >
                                                        {HOBBY_LABELS[hobby] || hobby}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {selectedHobbies.length > 0 && (
                                            <div className="form-text">
                                                Đã chọn: {selectedHobbies.length} sở thích
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-12">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="looking"
                                                checked={
                                                    form.looking_for_roommate === "1"
                                                }
                                                onChange={(e) => {
                                                    setSaved(false);
                                                    setForm({
                                                        ...form,
                                                        looking_for_roommate: e.target
                                                            .checked
                                                            ? "1"
                                                            : "0",
                                                    });
                                                }}
                                            />
                                            <label
                                                className="form-check-label"
                                                htmlFor="looking"
                                            >
                                                Tôi đang tìm bạn cùng phòng
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="card-footer bg-white d-flex justify-content-end gap-2">
                        <button className="btn btn-primary" disabled={busy}>
                            {busy ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
