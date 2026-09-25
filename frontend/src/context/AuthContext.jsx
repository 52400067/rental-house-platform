import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/authApi";
import { disconnectEcho } from "../api/echo";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user")) || null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(!!localStorage.getItem("token"));

    // Refresh the profile on first load if a token exists.
    useEffect(() => {
        if (!localStorage.getItem("token")) return;
        authApi
            .me()
            .then((u) => {
                setUser(u);
                localStorage.setItem("user", JSON.stringify(u));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const { token, user } = await authApi.login(email, password);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        return user;
    }

    async function register(payload) {
        const { token, user } = await authApi.register(payload);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        return user;
    }

    async function logout() {
        try {
            await authApi.logout();
        } catch {
            // token may already be invalid - clearing locally is enough
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        disconnectEcho();
        setUser(null);
    }

    async function refreshUser() {
        const u = await authApi.me();
        localStorage.setItem("user", JSON.stringify(u));
        setUser(u);
        return u;
    }

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, logout, refreshUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
