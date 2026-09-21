import api from "./axiosClient";

// API_CONTRACT §4 - "Xác thực và hồ sơ"
export const login = (email, password) =>
    api.post("/login", { email, password }).then((r) => r.data.data);

export const register = (payload) =>
    api.post("/register", payload).then((r) => r.data.data);

export const logout = () => api.post("/logout");

export const me = () => api.get("/me").then((r) => r.data.data);

export const updateProfile = (payload) =>
    api.put("/profile", payload).then((r) => r.data.data);
