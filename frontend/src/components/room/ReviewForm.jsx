import { useState } from "react";

/**
 * Review form: listing + landlord star selects and an optional comment.
 * Owns the draft state; submission and toasts stay with the page.
 */
export default function ReviewForm({ onSubmit, busy }) {
    const [form, setForm] = useState({
        listing_rating: 5,
        landlord_rating: 5,
        comment: "",
    });

    return (
        <form className="border rounded-3 p-3 mb-4" onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
        }}>
            <strong className="d-block mb-2">Để lại đánh giá của bạn</strong>
            <div className="row g-3 mb-2">
                <div className="col-6">
                    <label className="form-label small">Điểm tin đăng</label>
                    <select
                        className="form-select form-select-sm"
                        value={form.listing_rating}
                        onChange={(e) =>
                            setForm({ ...form, listing_rating: Number(e.target.value) })
                        }
                    >
                        {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                                {"★".repeat(n)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-6">
                    <label className="form-label small">Điểm chủ nhà</label>
                    <select
                        className="form-select form-select-sm"
                        value={form.landlord_rating}
                        onChange={(e) =>
                            setForm({ ...form, landlord_rating: Number(e.target.value) })
                        }
                    >
                        {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                                {"★".repeat(n)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <textarea
                className="form-control form-control-sm mb-2"
                rows={3}
                maxLength={1000}
                placeholder="Chia sẻ trải nghiệm của bạn (tùy chọn)"
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
            <button className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
        </form>
    );
}
