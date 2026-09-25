import { useState } from "react";
import { aiPriceAdvice } from "../../api/aiApi";
import { errMessage } from "../../api/axiosClient";
import { formatVnd } from "../../api/format";
import AiDisclaimer from "../AiDisclaimer";

/**
 * "Giá này hợp lý không?" — AI price advice card. Owns the advice state
 * and request; visibility of the ask button (students only) is the
 * caller's concern.
 */
export default function PriceAdvicePanel({ listingId, isStudent }) {
    const [advice, setAdvice] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function ask() {
        setBusy(true);
        setError("");
        try {
            setAdvice(await aiPriceAdvice(listingId));
        } catch (err) {
            setError(errMessage(err, "Không nhận được tư vấn lúc này."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="border rounded-3 p-3 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="fw-bold mb-0">
                    <i className="bi bi-cash-coin me-1" /> Giá này hợp lý không?
                </h5>
                {!advice && (
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={ask}
                        disabled={busy || !isStudent}
                        title={isStudent ? "Gợi ý giá từ AI" : "Chỉ dành cho sinh viên"}
                    >
                        {busy ? "Đang phân tích..." : "Hỏi AI"}
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-warning py-2 small mb-0">{error}</div>
            )}

            {advice && (
                <div>
                    <span
                        className={`badge text-bg-${
                            advice.verdict === "high"
                                ? "danger"
                                : advice.verdict === "low"
                                  ? "success"
                                  : "primary"
                        } mb-2`}
                    >
                        {advice.verdict === "high"
                            ? "Cao hơn thị trường"
                            : advice.verdict === "low"
                              ? "Rẻ hơn thị trường"
                              : "Hợp lý"}
                    </span>
                    <p className="small mb-1">
                        Giá tham khảo:{" "}
                        <strong>
                            {formatVnd(advice.fair_min)} – {formatVnd(advice.fair_max)}
                        </strong>{" "}
                        (dựa trên {advice.stats.count} tin tương tự, trung vị{" "}
                        {formatVnd(advice.stats.median)})
                    </p>
                    {advice.tips?.length > 0 && (
                        <ul className="small mb-2">
                            {advice.tips.map((t, i) => (
                                <li key={i}>{t}</li>
                            ))}
                        </ul>
                    )}
                    <div className="bg-light rounded-2 p-2 small mb-2">
                        <strong>Mẫu tin nhắn gửi chủ nhà:</strong>
                        <div className="fst-italic">"{advice.message}"</div>
                    </div>
                    <AiDisclaimer />
                </div>
            )}
        </div>
    );
}
