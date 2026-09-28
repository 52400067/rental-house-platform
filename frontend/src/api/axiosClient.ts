import axios from "axios";
import { API_URL } from "../config/env";

const TOKEN_KEY = "token";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    Accept: "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 -> xoa token + redirect login (destination la hang so, khong phu thuoc input).
axiosClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/** Thong bao loi gon nhat cho UI: message backend > loi validate dau tien > fallback. */
export function errMessage(err: unknown, fallback = "Có lỗi xảy ra."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.message) return data.message;
    const first = data?.errors && (Object.values(data.errors)[0] || [])[0];
    if (first) return first;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Map loi validate theo field tu response 422 ({} neu khong co). */
export function errFieldErrors(err: unknown): Record<string, string[]> {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.errors) return data.errors;
  }
  return {};
}

/** HTTP status cua loi axios (null neu khong phai axios error). */
export function errStatus(err: unknown): number | null {
  return axios.isAxiosError(err) ? (err.response?.status ?? null) : null;
}

interface ApiErrorShape {
  message?: string;
  errors?: Record<string, string[]>;
}

export default axiosClient;
