export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiFetchOptions = {
  method?: string;
  body?: any;
  token?: string | null;
  headers?: Record<string, string>;
};

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { method = "GET", body, token, headers } = options;

  // ✅ Tous les endpoints passent par /api
  const url = `${API_BASE}/api${path.startsWith("/") ? path : `/${path}`}`;

  // ✅ Si aucun token n’est fourni, on le prend depuis localStorage
  const resolvedToken =
    token !== undefined ? token : localStorage.getItem("token");

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      ...(headers ?? {}),
    },
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