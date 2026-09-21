import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getConversations } from "../../api/socialApi";
import { timeAgo } from "../../api/format";
import { useAuth } from "../../context/AuthContext";

export default function Messages() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getConversations()
            .then(setConversations)
            .catch(() => setError("Không tải được hội thoại."))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="py-4">
            <div className="container" style={{ maxWidth: 760 }}>
                <h1 className="h3 fw-bold mb-4">
                    <i className="bi bi-envelope me-2" />
                    Tin nhắn
                </h1>

                {loading && (
                    <div className="text-center py-5">
                        <div className="spinner-border" role="status" />
                    </div>
                )}

                {error && <div className="alert alert-warning">{error}</div>}

                {!loading && conversations.length === 0 && (
                    <div className="text-center py-5">
                        <i className="bi bi-chat-square fs-1 text-secondary" />
                        <h4 className="mt-3">Chưa có hội thoại nào</h4>
                        <p className="text-secondary">
                            Nhắn tin cho chủ nhà từ trang chi tiết phòng để bắt đầu.
                        </p>
                        <Link to="/rooms" className="btn btn-primary">
                            Tìm phòng
                        </Link>
                    </div>
                )}

                <div className="list-group">
                    {conversations.map((c) => (
                        <Link
                            key={c.id}
                            to={`/messages/${c.id}`}
                            className="list-group-item list-group-item-action d-flex gap-3 py-3"
                        >
                            {c.listing?.cover_image ? (
                                <img
                                    src={c.listing.cover_image}
                                    alt=""
                                    className="rounded"
                                    style={{
                                        width: 56,
                                        height: 56,
                                        objectFit: "cover",
                                    }}
                                />
                            ) : (
                                <div
                                    className="rounded bg-light d-flex align-items-center justify-content-center"
                                    style={{ width: 56, height: 56 }}
                                >
                                    <i className="bi bi-house-door text-secondary" />
                                </div>
                            )}

                            <div className="flex-grow-1 overflow-hidden">
                                <div className="d-flex justify-content-between">
                                    <strong className="small text-truncate">
                                        {c.other_user?.name || "Người dùng"}
                                    </strong>
                                    <span className="small text-secondary text-nowrap ms-2">
                                        {timeAgo(c.last_message?.created_at)}
                                    </span>
                                </div>
                                <div className="small text-secondary text-truncate">
                                    {c.listing?.title || "Tin đăng"}
                                </div>
                                <div
                                    className={`small text-truncate ${
                                        c.unread_count > 0 ? "fw-bold" : ""
                                    }`}
                                >
                                    {c.last_message?.body || "Chưa có tin nhắn"}
                                </div>
                            </div>

                            {c.unread_count > 0 && (
                                <span className="badge rounded-pill text-bg-primary align-self-center">
                                    {c.unread_count}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>

                {user?.role === "landlord" && (
                    <p className="small text-secondary mt-3 mb-0">
                        Đây là các hội thoại giữa bạn và sinh viên về tin đăng của bạn.
                    </p>
                )}
            </div>
        </div>
    );
}
