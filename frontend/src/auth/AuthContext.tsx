import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, getWallet, type MeResponse } from "../api/me";
import { adminRefreshSession, type AdminSessionResponse } from "../api/auth";
import { refreshPlayerSession, type PlayerSessionResponse } from "../api/http";
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

  setToken: (t: string | null, refreshToken?: string | null) => void;
  setAdminToken: (t: string | null, refreshToken?: string | null) => void;
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
  const [refreshToken, setRefreshTokenState] = useState<string | null>(() =>
    localStorage.getItem("refresh_token")
  );
  const [adminToken, setAdminTokenState] = useState<string | null>(() =>
    localStorage.getItem("admin_token")
  );
  const [adminRefreshToken, setAdminRefreshTokenState] = useState<string | null>(() =>
    localStorage.getItem("admin_refresh_token")
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

  const setToken = (t: string | null, nextRefreshToken?: string | null) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem("token", t);
      if (nextRefreshToken) {
        setRefreshTokenState(nextRefreshToken);
        localStorage.setItem("refresh_token", nextRefreshToken);
      }
    } else {
      setRefreshTokenState(null);
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
    }
  };

  const setAdminToken = (t: string | null, refreshToken?: string | null) => {
    setAdminTokenState(t);
    if (t) {
      localStorage.setItem("admin_token", t);
      if (refreshToken) {
        setAdminRefreshTokenState(refreshToken);
        localStorage.setItem("admin_refresh_token", refreshToken);
      }
    } else {
      setAdminRefreshTokenState(null);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_refresh_token");
    }
  };

  const clearAdminSession = () => {
    setAdminToken(null);
  };

  const refreshPlayerAccess = async (activeRefreshToken = refreshToken) => {
    try {
      const session = await refreshPlayerSession(activeRefreshToken);
      setToken(session.access_token, session.refresh_token);
      return session;
    } catch {
      setToken(null);
      setMe(null);
      setCredits(null);
      return null;
    }
  };

  const refreshAdminAccess = async (refreshToken = adminRefreshToken) => {
    try {
      const session = await adminRefreshSession(refreshToken);
      setAdminToken(session.admin_access_token, session.admin_refresh_token);
      return session;
    } catch {
      setAdminToken(null);
      return null;
    }
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
    if (!token && !localStorage.getItem("token")) return;
    const data = await getMe();
    setMe(data);
  };

  const refreshWallet = async () => {
    if (!token && !localStorage.getItem("token")) return;
    const data = await getWallet();
    setCredits(typeof data?.credits === "number" ? data.credits : 0);
  };

  const refreshAuth = async () => {
    if (!token && refreshToken) {
      const session = await refreshPlayerAccess(refreshToken);
      if (!session) {
        setIsLoading(false);
        return;
      }
    }

    if (!token && !localStorage.getItem("token")) {
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
    if (!token) return;

    const decoded = decodeJwt<DecodedPlayerToken>(token);
    const refreshDelay = decoded?.exp ? decoded.exp * 1000 - Date.now() - 60_000 : 0;

    if (!decoded?.exp) {
      refreshPlayerAccess().catch(() => {});
      return;
    }

    if (refreshDelay <= 0) {
      refreshPlayerAccess().catch(() => {});
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refreshPlayerAccess().catch(() => {});
    }, refreshDelay);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshToken]);

  useEffect(() => {
    if (!adminToken) return;

    const decoded = decodeJwt<DecodedAdminToken>(adminToken);
    const refreshDelay = decoded?.exp ? decoded.exp * 1000 - Date.now() - 60_000 : 0;

    if (!decoded?.exp) {
      setAdminToken(null);
      return;
    }

    if (refreshDelay <= 0) {
      refreshAdminAccess().catch(() => {});
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refreshAdminAccess().catch(() => {});
    }, refreshDelay);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, adminRefreshToken]);

  useEffect(() => {
    const onPlayerSessionRefreshed = (event: Event) => {
      const session = (event as CustomEvent<PlayerSessionResponse>).detail;
      if (!session?.access_token) return;
      setToken(session.access_token, session.refresh_token);
    };
    const onPlayerSessionCleared = () => {
      setToken(null);
      setMe(null);
      setCredits(null);
    };
    const onAdminSessionRefreshed = (event: Event) => {
      const session = (event as CustomEvent<AdminSessionResponse>).detail;
      if (!session?.admin_access_token) return;
      setAdminToken(session.admin_access_token, session.admin_refresh_token);
    };
    const onAdminSessionCleared = () => {
      setAdminToken(null);
    };

    window.addEventListener("player-session-refreshed", onPlayerSessionRefreshed);
    window.addEventListener("player-session-cleared", onPlayerSessionCleared);
    window.addEventListener("admin-session-refreshed", onAdminSessionRefreshed);
    window.addEventListener("admin-session-cleared", onAdminSessionCleared);
    return () => {
      window.removeEventListener("player-session-refreshed", onPlayerSessionRefreshed);
      window.removeEventListener("player-session-cleared", onPlayerSessionCleared);
      window.removeEventListener("admin-session-refreshed", onAdminSessionRefreshed);
      window.removeEventListener("admin-session-cleared", onAdminSessionCleared);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
