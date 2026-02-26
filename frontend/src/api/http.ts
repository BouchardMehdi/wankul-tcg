export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, token, headers, auth = true } = options;

  // ✅ Tous les endpoints passent par /api
  const url = `${API_BASE}/api${path.startsWith("/") ? path : `/${path}`}`;

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