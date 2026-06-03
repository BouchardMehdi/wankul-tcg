import { API_ORIGIN } from "./http";

export type SystemStatusResponse = {
  maintenanceMode: boolean;
  allowAdminBypass: boolean;
  message: string;
  eta: string | null;
  sealLabel: string;
  sealText: string;
};

export async function getSystemStatus(): Promise<SystemStatusResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`${API_ORIGIN}/api/system/status`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    const data = await res.json().catch(() => ({} as Partial<SystemStatusResponse>));

    if (!res.ok) {
      throw new Error("Impossible de lire le statut de l'application.");
    }

    return {
      maintenanceMode: data.maintenanceMode === true,
      allowAdminBypass: data.allowAdminBypass !== false,
      message: data.message || "",
      eta: data.eta || null,
      sealLabel: data.sealLabel || "",
      sealText: data.sealText || "",
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
