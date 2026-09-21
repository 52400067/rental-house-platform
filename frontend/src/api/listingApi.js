import api from "./axiosClient";

// API_CONTRACT §4 - "Duyệt tin đăng"
export function getListings(params) {
    return api
        .get("/listings", { params })
        .then((r) => ({ data: r.data.data, meta: r.data.meta }));
}

export const getListing = (id) =>
    api.get(`/listings/${id}`).then((r) => r.data.data);

export function getListingReviews(id, page = 1) {
    return api
        .get(`/listings/${id}/reviews`, { params: { page } })
        .then((r) => ({ data: r.data.data, meta: r.data.meta }));
}

// API_CONTRACT §4 - "Đánh giá (sinh viên)"
export const createReview = (listingId, payload) =>
    api.post(`/listings/${listingId}/reviews`, payload).then((r) => r.data.data);

// API_CONTRACT §4 - "Dữ liệu tham chiếu"
export const getWards = () => api.get("/wards").then((r) => r.data.data);
export const getSchools = () => api.get("/schools").then((r) => r.data.data);
export const getAmenities = () => api.get("/amenities").then((r) => r.data.data);
