function getDefaultApiOrigin() {
  return import.meta.env.DEV ? "http://localhost:3000" : "";
}

function isLocalhostOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}

function resolveApiOrigin() {
  const configuredOrigin = (import.meta.env.VITE_API_URL ?? "").trim();
  const rawOrigin = configuredOrigin || getDefaultApiOrigin();
  const normalizedOrigin = rawOrigin.replace(/\/$/, "").replace(/\/api\/?$/, "");

  if (!import.meta.env.DEV && isLocalhostOrigin(normalizedOrigin)) {
    return "";
  }

  return normalizedOrigin;
}

export const API_ORIGIN = resolveApiOrigin();
export const API_BASE = API_ORIGIN;

type ApiFetchOptions = {
  method?: string;
  body?: any;
  token?: string | null;
  headers?: Record<string, string>;
  /**
   * true (défaut) = ajoute Authorization si token dispo
   * false = n'ajoute jamais Authorization
   */
  auth?: boolean;
};

export type PlayerSessionResponse = {
  access_token: string;
  refresh_token: string;
  refresh_expires_in?: string;
};

function storePlayerSession(session: PlayerSessionResponse) {
  localStorage.setItem("token", session.access_token);
  localStorage.setItem("refresh_token", session.refresh_token);
  window.dispatchEvent(new CustomEvent("player-session-refreshed", { detail: session }));
}

function clearStoredPlayerSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event("player-session-cleared"));
}

export async function refreshPlayerSession(refreshToken = localStorage.getItem("refresh_token")) {
  if (!refreshToken) {
    clearStoredPlayerSession();
    throw new Error("Session expirée.");
  }

  const res = await fetch(`${API_ORIGIN}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    clearStoredPlayerSession();
    const msg =
      typeof data?.message === "string"
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(", ")
          : "Session expirée.";
    throw new Error(msg);
  }

  storePlayerSession(data as PlayerSessionResponse);
  return data as PlayerSessionResponse;
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {},
  retryOnUnauthorized = true
): Promise<T> {
  const { method = "GET", body, token, headers, auth = true } = options;

  // ✅ Tous les endpoints passent par /api
  const url = `${API_ORIGIN}/api${path.startsWith("/") ? path : `/${path}`}`;

  // ✅ Token : fourni explicitement OU depuis localStorage
  const resolvedToken =
    token !== undefined ? token : localStorage.getItem("token");

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(auth && resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...(headers ?? {}),
  };

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({} as any));

  if (res.status === 401 && auth && retryOnUnauthorized && path !== "/auth/refresh") {
    await refreshPlayerSession();
    return apiFetch<T>(path, options, false);
  }

  if (!res.ok) {
    const msg =
      typeof data?.message === "string"
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(", ")
          : `Erreur API (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}
