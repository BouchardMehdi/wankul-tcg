import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMe, getWallet, type MeResponse } from "../api/me";

export type AuthState = {
  token: string | null;

  isAuthenticated: boolean;
  isLoading: boolean;

  user: MeResponse | null;
  me: MeResponse | null;
  credits: number | null;

  setToken: (t: string | null) => void;
  refreshAuth: () => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem("token")
  );

  const [me, setMe] = useState<MeResponse | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ---------------- TOKEN MANAGEMENT ---------------- */

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
  };

  const logout = () => {
    setToken(null);
    setMe(null);
    setCredits(null);
  };

  /* ---------------- DATA REFRESH ---------------- */

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

  /* ---------------- INIT ON MOUNT ---------------- */

  useEffect(() => {
    refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ---------------- AUTO REFRESH WALLET ---------------- */

  useEffect(() => {
    if (!token) return;

    const id = window.setInterval(() => {
      refreshWallet().catch(() => {});
    }, 5000); // refresh toutes les 5s (moins agressif que 2s)

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isAuthenticated = !!token;
  const user = me;

  const value = useMemo(
    () => ({
      token,
      isAuthenticated,
      isLoading,
      user,
      me,
      credits,
      setToken,
      refreshAuth,
      refreshMe,
      refreshWallet,
      logout,
    }),
    [token, isAuthenticated, isLoading, user, me, credits]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
