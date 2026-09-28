import api from "./axiosClient";
import type {
  Amenity,
  City,
  Listing,
  ListingPayload,
  ListingQuery,
  PaginationMeta,
  Review,
  ReviewPayload,
  School,
  Ward,
} from "../types/api";

export interface Paged<T> {
  data: T[];
  meta: PaginationMeta;
}

// API_CONTRACT §4 - "Duyệt tin đăng"
export function getListings(params: ListingQuery): Promise<Paged<Listing>> {
  return api
    .get("/listings", { params })
    .then((r) => ({ data: r.data.data, meta: r.data.meta }));
}

export const getListing = (id: number): Promise<Listing> =>
  api.get(`/listings/${id}`).then((r) => r.data.data);

export function getListingReviews(id: number, page = 1): Promise<Paged<Review>> {
  return api
    .get(`/listings/${id}/reviews`, { params: { page } })
    .then((r) => ({ data: r.data.data, meta: r.data.meta }));
}

// API_CONTRACT §4 - "Đánh giá (sinh viên)"
export const createReview = (
  listingId: number,
  payload: ReviewPayload
): Promise<Review> =>
  api.post(`/listings/${listingId}/reviews`, payload).then((r) => r.data.data);

// API_CONTRACT §4 - "Dữ liệu tham chiếu"
// Cascade: chọn Tỉnh/TP trước, rồi ward/trường lọc theo city_id (tùy chọn).
export const getCities = (): Promise<City[]> =>
  api.get("/cities").then((r) => r.data.data);

export const getWards = (cityId?: number | null): Promise<Ward[]> =>
  api
    .get("/wards", { params: cityId ? { city_id: cityId } : {} })
    .then((r) => r.data.data);

export const getSchools = (cityId?: number | null): Promise<School[]> =>
  api
    .get("/schools", { params: cityId ? { city_id: cityId } : {} })
    .then((r) => r.data.data);

export const getAmenities = (): Promise<Amenity[]> =>
  api.get("/amenities").then((r) => r.data.data);

// Chủ nhà: tao/cap nhat tin (dung chung payload type voi landlordApi).
export type { ListingPayload };
