import api from "./axiosClient";

// API_CONTRACT §4 - "AI". Backend proxies to the AI service; may take ~30s.
export const aiRoommates = () =>
    api.post("/ai/roommates").then((r) => r.data.data);

export const aiPriceAdvice = (listingId) =>
    api.post("/ai/price-advice", { listing_id: listingId }).then((r) => r.data.data);

export const aiAreaSuggestions = (payload) =>
    api.post("/ai/area-suggestions", payload).then((r) => r.data.data);

export const aiChat = (message, history = [], listingId = null) =>
    api
        .post("/ai/chat", {
            message,
            history: history.slice(-10),
            listing_id: listingId || undefined,
        })
        .then((r) => r.data.data);

export const aiDescription = (payload) =>
    api.post("/ai/description", payload).then((r) => r.data.data);
