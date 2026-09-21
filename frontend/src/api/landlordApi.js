import api from "./axiosClient";

// API_CONTRACT §4 - "Chủ nhà: quản lý tin đăng"
export function getMyListings(page = 1, status = "") {
    return api
        .get("/my/listings", { params: { page, status: status || undefined } })
        .then((r) => ({ data: r.data.data, meta: r.data.meta }));
}

export const createListing = (payload) =>
    api.post("/listings", payload).then((r) => r.data.data);

export const updateListing = (id, payload) =>
    api.put(`/listings/${id}`, payload).then((r) => r.data.data);

export const deleteListing = (id) => api.delete(`/listings/${id}`);

export function uploadImages(listingId, files) {
    const form = new FormData();
    files.forEach((f) => form.append("images[]", f));
    return api
        .post(`/listings/${listingId}/images`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data.data);
}

export const deleteImage = (listingId, imageId) =>
    api.delete(`/listings/${listingId}/images/${imageId}`);
