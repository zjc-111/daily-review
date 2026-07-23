// AuthContext — shared auth state across all components
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserProfileResponse, LoginResponse } from "@shared/api.interface";

const AUTH_TOKEN_KEY = "dr_auth_token";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ---- Types ----

interface AuthState {
  user: UserProfileResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  sendCode: (phone: string) => Promise<{ success: boolean; error?: string; debugCode?: string }>;
  verifyCode: (phone: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- Fetch helper ----

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(API_BASE + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const err: any = new Error(json.error || `HTTP ${res.status}`);
    err.response = { data: json };
    throw err;
  }
  return json.data as T;
}

// ---- Provider ----

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check stored token
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    request<UserProfileResponse>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (data) setUser(data);
        else localStorage.removeItem(AUTH_TOKEN_KEY);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sendCode = useCallback(
    async (phone: string) => {
      try {
        const data = await request<{ message: string; debug?: { code: string } }>(
          "/auth/send-code",
          { method: "POST", body: JSON.stringify({ phone }) },
        );
        return { success: true, debugCode: data?.debug?.code };
      } catch (err: any) {
        return {
          success: false,
          error: err?.response?.data?.error || "网络错误，请稍后重试",
        };
      }
    },
    [],
  );

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      try {
        const data = await request<LoginResponse>("/auth/verify", {
          method: "POST",
          body: JSON.stringify({ phone, code }),
        });
        if (data?.token && data?.user) {
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
          setUser(data.user);
          return { success: true };
        }
        return { success: false, error: "登录失败" };
      } catch (err: any) {
        return {
          success: false,
          error: err?.response?.data?.error || "网络错误，请稍后重试",
        };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    sendCode,
    verifyCode,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---- Hook ----

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
