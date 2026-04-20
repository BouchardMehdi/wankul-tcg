import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, getWallet, type MeResponse } from "../api/me";
import { unsubscribeCurrentBrowserFromPush } from "../utils/pwaNotifications";

type DecodedPlayerToken = {
  sub?: number;
  username?: string;
  role?: "player" | "admin";
  scope?: "player";
  exp?: number;
};

type DecodedAdminToken = {
  sub?: number;
  username?: string;
  role?: "admin";
  scope?: "admin";
  exp?: number;
};

export type AuthState = {
  token: string | null;
  adminToken: string | null;

  isAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  isLoading: boolean;

  user: MeResponse | null;
  me: MeResponse | null;
  credits: number | null;
  role: "player" | "admin";

  setToken: (t: string | null) => void;
  setAdminToken: (t: string | null) => void;
  clearAdminSession: () => void;
  refreshAuth: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function decodeJwt<T>(token: string | null): T | null {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as T;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem("token")
  );
  const [adminToken, setAdminTokenState] = useState<string | null>(() =>
    localStorage.getItem("admin_token")
  );

  const [me, setMe] = useState<MeResponse | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodedPlayer = decodeJwt<DecodedPlayerToken>(token);
  const decodedAdmin = decodeJwt<DecodedAdminToken>(adminToken);

  const role: "player" | "admin" =
    decodedPlayer?.role === "admin" ? "admin" : "player";

  const isAdminAuthenticated =
    !!adminToken &&
    decodedAdmin?.scope === "admin" &&
    decodedAdmin?.role === "admin";

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
  };

  const setAdminToken = (t: string | null) => {
    setAdminTokenState(t);
    if (t) localStorage.setItem("admin_token", t);
    else localStorage.removeItem("admin_token");
  };

  const clearAdminSession = () => {
    setAdminToken(null);
  };

  const logout = () => {
    const activeToken = token;
    if (activeToken) {
      void unsubscribeCurrentBrowserFromPush(activeToken);
    }
    setToken(null);
    setAdminToken(null);
    setMe(null);
    setCredits(null);
  };

  const refreshMe = async () => {
    if (!token) return;
    const data = await getMe();
    setMe(data);
  };

  const refreshWallet = async () => {
    if (!token) return;
    const data = await getWallet();
    setCredits(typeof data?.credits === "number" ? data.credits : 0);
  };

  const refreshAuth = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      await Promise.all([refreshMe(), refreshWallet()]);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const id = window.setInterval(() => {
      refreshWallet().catch(() => {});
    }, 5000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!adminToken) return;

    const decoded = decodeJwt<DecodedAdminToken>(adminToken);
    const now = Math.floor(Date.now() / 1000);

    if (!decoded?.exp || decoded.exp <= now) {
      setAdminToken(null);
    }
  }, [adminToken]);

  const isAuthenticated = !!token;
  const user = me;

  const value = useMemo(
    () => ({
      token,
      adminToken,
      isAuthenticated,
      isAdminAuthenticated,
      isLoading,
      user,
      me,
      credits,
      role,
      setToken,
      setAdminToken,
      clearAdminSession,
      refreshAuth,
      refreshMe,
      refreshWallet,
      logout,
    }),
    [
      token,
      adminToken,
      isAuthenticated,
      isAdminAuthenticated,
      isLoading,
      user,
      me,
      credits,
      role,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
