import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { getConversations } from "../../api/socialApi";
import { getEcho } from "../../api/echo";
import { timeAgo } from "../../api/format";
import { useAuth } from "../../context/AuthContext";
import ListRowsSkeleton from "../../components/ui/ListRowsSkeleton";

/**
 * Trang Tin nhắn = hai cốp kiểu Messenger/Gmail:
 *  - Cốp trái: danh sách hội thoại (sidebar, cuộn riêng).
 *  - Cốp phải: thread đang mở qua <Outlet /> (route con /messages/:id).
 * Không chọn hội thoại nào thì cốp phải hiện placeholder.
 */
export default function Messages() {
    const { user } = useAuth();
    const { id: activeId } = useParams();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getConversations()
            .then(setConversations)
            .catch(() => setError("Không tải được hội thoại."))
            .finally(() => setLoading(false));
    }, []);

    // Realtime sidebar: new messages and unsend/delete events update the
    // preview, ordering and unread badge without polling.
    useEffect(() => {
        const echo = getEcho();
        if (!echo) return undefined;

        const chan = echo.private(`App.Models.User.${user?.id}`);

        chan.listen(".message.sent", (e) => {
            setConversations((prev) => {
                const conv = e.conversation;
                if (!conv) return prev;
                const rest = prev.filter((c) => c.id !== conv.id);
                return [conv, ...rest];
            });
        });

        chan.listen(".message.deleted", (e) => {
            setConversations((prev) => {
                const conv = e.conversation;
                if (!conv) return prev;
                return prev.map((c) => (c.id === conv.id ? conv : c));
            });
        });

        return () => {
            echo.leave(`App.Models.User.${user?.id}`);
        };
    }, [user?.id]);

    return (
        <div className="messages-page">
            {/* Cốp trái: danh sách hội thoại */}
            <aside className="messages-sidebar">
                <div className="messages-sidebar-head">
                    <h1 className="h6 fw-bold mb-0">
                        <i className="bi bi-envelope me-2" />
                        Tin nhắn
                    </h1>
                </div>

                <div className="messages-list">
                    {loading && <ListRowsSkeleton count={6} />}

                    {error && <div className="alert alert-warning m-3">{error}</div>}

                    {!loading && conversations.length === 0 && (
                        <div className="text-center py-5 px-3">
                            <i className="bi bi-chat-square fs-1 text-secondary" />
                            <p className="small text-secondary mt-2 mb-0">
                                Nhắn tin cho chủ nhà từ trang chi tiết phòng để bắt
                                đầu.
                            </p>
                            <Link to="/rooms" className="btn btn-primary btn-sm mt-3">
                                Tìm phòng
                            </Link>
                        </div>
                    )}

                    {conversations.map((c) => (
                        <Link
                            key={c.id}
                            to={`/messages/${c.id}`}
                            className={`messages-item d-flex gap-2 align-items-center${
                                String(c.id) === String(activeId) ? " active" : ""
                            }`}
                        >
                            {c.listing?.cover_image ? (
                                <img
                                    src={c.listing.cover_image}
                                    alt=""
                                    className="messages-item-img"
                                />
                            ) : (
                                <div className="messages-item-img messages-item-img-empty">
                                    <i className="bi bi-house-door" />
                                </div>
                            )}

                            <div className="flex-grow-1 overflow-hidden">
                                <div className="d-flex justify-content-between gap-2">
                                    <strong className="small text-truncate">
                                        {c.other_user?.name || "Người dùng"}
                                    </strong>
                                    <span className="messages-item-time text-nowrap">
                                        {timeAgo(c.last_message?.created_at)}
                                    </span>
                                </div>
                                <div className="messages-item-preview text-truncate">
                                    <span className="text-secondary">
                                        {c.listing?.title || "Trò chuyện trực tiếp"}
                                    </span>
                                    {" · "}
                                    {c.last_message?.body || "Chưa có tin nhắn"}
                                </div>
                            </div>

                            {c.unread_count > 0 && (
                                <span className="badge rounded-pill text-bg-primary">
                                    {c.unread_count}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>

                {user?.role === "landlord" && (
                    <div className="messages-sidebar-foot small text-secondary">
                        Hội thoại giữa bạn và sinh viên về tin đăng của bạn.
                    </div>
                )}
            </aside>

            {/* Cốp phải: thread đang mở (route con /messages/:id) */}
            <section className="messages-content">
                <Outlet />
            </section>
        </div>
    );
}
