import api from "./axiosClient";
import type { AuthResponse, RegisterPayload, User } from "../types/api";

// API_CONTRACT §4 - "Xác thực và hồ sơ"
export const login = (email: string, password: string): Promise<AuthResponse> =>
  api.post("/login", { email, password }).then((r) => r.data.data);

export const register = (payload: RegisterPayload): Promise<AuthResponse> =>
  api.post("/register", payload).then((r) => r.data.data);

export const logout = (): Promise<unknown> => api.post("/logout");

export const me = (): Promise<User> => api.get("/me").then((r) => r.data.data);

export const updateProfile = (payload: Partial<User>): Promise<User> =>
  api.put("/profile", payload).then((r) => r.data.data);
