export type InAppNotificationAction = {
  action: string;
  title: string;
  url?: string;
};

export type InAppNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  kind?: string;
  accent?: string;
  icon?: string;
  badge?: string;
  image?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  actions?: InAppNotificationAction[];
};

export function emitInAppNotification(payload: InAppNotificationPayload) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("wankul:in-app-notification", {
      detail: payload,
    }),
  );
}
