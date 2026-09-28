import api from "./axiosClient";
import type { Conversation, Favorite, Message, MessagePayload, PaginationMeta } from "../types/api";
import type { Paged } from "./listingApi";

// API_CONTRACT §4 - "Yêu thích (sinh viên)"
export const getFavorites = (page = 1): Promise<Paged<Favorite>> =>
  api
    .get("/favorites", { params: { page } })
    .then((r) => ({ data: r.data.data, meta: r.data.meta as PaginationMeta }));

export const addFavorite = (listingId: number): Promise<unknown> =>
  api.put(`/favorites/${listingId}`).then((r) => r.data.data);

export const removeFavorite = (listingId: number): Promise<unknown> =>
  api.delete(`/favorites/${listingId}`).then((r) => r.data.data);

// API_CONTRACT §4 - "Nhắn tin"
export const getConversations = (): Promise<Conversation[]> =>
  api.get("/conversations").then((r) => r.data.data);

// Facebook-style deletion: scope "unsent" (Thu hồi, sender only) or
// "self" (Xóa chỉ ở phía mình). Server returns 204-style null data.
export type DeleteScope = "unsent" | "self";

export const deleteMessage = (
  messageId: number,
  scope: DeleteScope
): Promise<unknown> =>
  api.delete(`/messages/${messageId}`, { params: { scope } }).then((r) => r.data.data);

// Messenger reactions: PUT dat/doi emoji (cung emoji lan nua = bo/toggle).
export const reactToMessage = (
  messageId: number,
  emoji: string
): Promise<Message["reactions"]> =>
  api
    .put(`/messages/${messageId}/reactions`, { emoji })
    .then((r) => r.data.data.reactions);

export const startConversation = (listingId: number): Promise<Conversation> =>
  api.post("/conversations", { listing_id: listingId }).then((r) => r.data.data);

// Hội thoại trực tiếp giữa 2 sinh viên (không qua tin đăng) - từ hồ sơ công khai.
export const startDirectConversation = (userId: number): Promise<Conversation> =>
  api.post(`/users/${userId}/message`).then((r) => r.data.data);

export const getMessages = (
  conversationId: number | string,
  afterId: number | null = null
): Promise<Message[]> =>
  api
    .get(`/conversations/${conversationId}/messages`, {
      params: { after_id: afterId || undefined },
    })
    .then((r) => r.data.data);

export interface SendMessagePayload extends MessagePayload {
  file?: File | null;
}

export const sendMessage = (
  conversationId: number | string,
  { body, file }: SendMessagePayload
): Promise<Message> => {
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

export const markRead = (conversationId: number | string): Promise<unknown> =>
  api.post(`/conversations/${conversationId}/read`);
