import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { getConversations } from "../../api/socialApi";
import { getEcho } from "../../api/echo";
import { timeAgo } from "../../api/format";
import { useAuth } from "../../context/AuthContext";
import { CONV_PREVIEW_EVENT } from "../../constants/events";
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
                const old = prev.find((c) => c.id === conv.id);
                // Messenger preview: merge listing/other_user từ bản cũ,
                // cập nhật preview + đẩy item lên đầu. Tin của NGƯỜI KHÁC
                // mới tăng unread; tin của mình giữ nguyên badge.
                const merged = {
                    ...(old || {}),
                    ...conv,
                    unread_count:
                        Number(e.message?.sender_id) === Number(user?.id)
                            ? (old?.unread_count || 0)
                            : (old?.unread_count || 0) + 1,
                    last_message: {
                        ...(old?.last_message || {}),
                        ...conv.last_message,
                    },
                };
                return [merged, ...rest];
            });
        });

        // Thread mở phát window-event này mỗi khi có tin mới (WS hoặc HTTP);
        // dùng nó làm nguồn cập nhật preview chính xác nhất cho sidebar.
        const onPreview = (ev) => {
            const d = ev.detail || {};
            setConversations((prev) => {
                if (!d.conversation_id) return prev;
                const rest = prev.filter((c) => String(c.id) !== String(d.conversation_id));
                const old = prev.find((c) => String(c.id) === String(d.conversation_id));
                if (!old) return prev; // hội thoại lạ: giữ nguyên (fetch lại sau)
                return [
                    {
                        ...old,
                        last_message: d.last_message,
                    },
                    ...rest,
                ];
            });
        };
        window.addEventListener(CONV_PREVIEW_EVENT, onPreview);

        chan.listen(".message.deleted", (e) => {
            setConversations((prev) => {
                const conv = e.conversation;
                if (!conv) return prev;
                return prev.map((c) => (c.id === conv.id ? conv : c));
            });
        });

        return () => {
            window.removeEventListener(CONV_PREVIEW_EVENT, onPreview);
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

                    {conversations.map((c) => {
                        // So sánh lỏng: sender_id từ WS là number, từ REST
                        // là number, nhưng cứ Number() cho chắc.
                        const mine =
                            Number(c.last_message?.sender_id) === Number(user?.id);
                        const preview = c.last_message?.attachment_name
                            ? "Đã gửi một tệp đính kèm"
                            : c.last_message?.body || "Chưa có tin nhắn";
                        return (
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
                                <div
                                    className={`messages-item-preview text-truncate${
                                        c.unread_count > 0 ? " fw-bold" : ""
                                    }`}
                                >
                                    {/* Messenger: tin của mình có prefix "Bạn:" */}
                                    {mine && <span className="text-secondary">Bạn: </span>}
                                    {preview}
                                </div>
                            </div>

                            {c.unread_count > 0 && (
                                <span className="badge rounded-pill text-bg-primary">
                                    {c.unread_count}
                                </span>
                            )}
                        </Link>
                        );
                    })}
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
