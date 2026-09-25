import api from "./axiosClient";

// API_CONTRACT §4 - "Yêu thích (sinh viên)"
export const getFavorites = (page = 1) =>
    api
        .get("/favorites", { params: { page } })
        .then((r) => ({ data: r.data.data, meta: r.data.meta }));

export const addFavorite = (listingId) =>
    api.put(`/favorites/${listingId}`).then((r) => r.data.data);

export const removeFavorite = (listingId) =>
    api.delete(`/favorites/${listingId}`).then((r) => r.data.data);

// API_CONTRACT §4 - "Nhắn tin"
export const getConversations = () =>
    api.get("/conversations").then((r) => r.data.data);

// Facebook-style deletion: scope "unsent" (Thu hồi, sender only) or
// "self" (Xóa chỉ ở phía mình). Server returns 204-style null data.
export const deleteMessage = (messageId, scope) =>
    api.delete(`/messages/${messageId}`, { params: { scope } }).then((r) => r.data.data);

export const startConversation = (listingId) =>
    api.post("/conversations", { listing_id: listingId }).then((r) => r.data.data);

// Hội thoại trực tiếp giữa 2 sinh viên (không qua tin đăng) - từ hồ sơ công khai.
export const startDirectConversation = (userId) =>
    api.post(`/users/${userId}/message`).then((r) => r.data.data);

export const getMessages = (conversationId, afterId = null) =>
    api
        .get(`/conversations/${conversationId}/messages`, {
            params: { after_id: afterId || undefined },
        })
        .then((r) => r.data.data);

export const sendMessage = (conversationId, { body, file }) => {
    if (file) {
        const form = new FormData();
        form.append("body", body || "");
        form.append("file", file);
        return api
            .post(`/conversations/${conversationId}/messages`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            })
            .then((r) => r.data.data);
    }
    return api
        .post(`/conversations/${conversationId}/messages`, { body })
        .then((r) => r.data.data);
};

export const markRead = (conversationId) =>
    api.post(`/conversations/${conversationId}/read`);
