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
// Cascade: chọn Tỉnh/TP trước, rồi ward/trường lọc theo city_id (tùy chọn).
export const getCities = () => api.get("/cities").then((r) => r.data.data);
export const getWards = (cityId) =>
    api
        .get("/wards", { params: cityId ? { city_id: cityId } : {} })
        .then((r) => r.data.data);
export const getSchools = (cityId) =>
    api
        .get("/schools", { params: cityId ? { city_id: cityId } : {} })
        .then((r) => r.data.data);
export const getAmenities = () => api.get("/amenities").then((r) => r.data.data);
