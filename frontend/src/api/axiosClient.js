import axios from "axios";

// API_CONTRACT §1: base URL, Accept header, Bearer token, clear token on 401.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
    headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 && !err.config?.url?.includes("/login")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            // Soft redirect so any stale UI state disappears.
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

/** Vietnamese message from the standard error body { message, errors } */
export function errMessage(err, fallback = "Có lỗi xảy ra. Vui lòng thử lại.") {
    const res = err?.response?.data;
    if (res?.errors) {
        const first = Object.values(res.errors)[0];
        if (Array.isArray(first) && first[0]) return first[0];
    }
    return res?.message || fallback;
}

export default api;
