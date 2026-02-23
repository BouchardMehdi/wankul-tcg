import { getToken } from "../auth/token";

type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  auth?: boolean; // ✅ par défaut: true
  headers?: Record<string, string>;
};

/**
 * ✅ DEV: mets VITE_API_URL=http://localhost:3000 dans .env si tu veux
 * ✅ Sinon fallback sur http://localhost:3000
 */
const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";

  const headers: Record<string, string> = {
    ...(opts.headers ?? {}),
  };

  // ✅ Auth par défaut, désactivable avec auth:false
  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  // path doit commencer par /
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, { method, headers, body });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const payload = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok) {
    const msg =
      (payload &&
        typeof payload === "object" &&
        ((payload as any).message || (payload as any).error)) ||
      (typeof payload === "string" && payload.slice(0, 200)) ||
      `HTTP ${res.status}`;

    throw new Error(msg);
  }

  return payload as T;
}