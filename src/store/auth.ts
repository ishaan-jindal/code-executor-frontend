import { create } from "zustand";
import Cookies from "js-cookie";
import api from "@/lib/api";

export interface User {
  id: string;
  username: string;
  email: string;
  tier: "free" | "starter" | "professional" | "enterprise";
  rateLimit: number;
  created_at: number;
  role?: "user" | "admin";
}

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  setTokens: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isLoading: true,

  hydrate: async () => {
    const token = Cookies.get("access_token");
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      const user = data.data;
      set({ user, isAdmin: user.role === "admin", isLoading: false });
    } catch {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      set({ user: null, isAdmin: false, isLoading: false });
    }
  },

  setTokens: async (access, refresh) => {
    Cookies.set("access_token", access, { expires: 1 / 96 });
    Cookies.set("refresh_token", refresh, { expires: 7 });
    const { data } = await api.get("/auth/me");
    const user = data.data;
    set({ user, isAdmin: user.role === "admin" });
  },

  logout: async () => {
    const refresh = Cookies.get("refresh_token");
    try {
      if (refresh) await api.post("/auth/logout", { refreshToken: refresh });
    } catch {}
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    set({ user: null, isAdmin: false });
  },
}));