import {
  deletePushSubscription,
  getPushPublicConfig,
  savePushSubscription,
  type BrowserPushSubscriptionPayload,
} from "../api/push";

export type PwaNotificationPermission = NotificationPermission | "unsupported";

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isPwaNotificationSupported() {
  return canUseNotifications();
}

export function getPwaNotificationPermission(): PwaNotificationPermission {
  if (!canUseNotifications()) {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestPwaNotificationPermission(): Promise<PwaNotificationPermission> {
  if (!canUseNotifications()) {
    return "unsupported";
  }

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function base64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }

  return output;
}

function toSerializableSubscription(
  subscription: PushSubscription,
): BrowserPushSubscriptionPayload {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    throw new Error("Push subscription incomplete.");
  }

  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh,
      auth,
    },
  };
}

async function ensurePushServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service worker unsupported.");
  }

  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;

  return navigator.serviceWorker.register("/sw.js");
}

export async function subscribeCurrentBrowserToPush(token?: string | null) {
  if (getPwaNotificationPermission() !== "granted") {
    return false;
  }

  const pushConfig = await getPushPublicConfig();
  if (!pushConfig.enabled || !pushConfig.publicKey) {
    throw new Error("Push notifications are not configured on the server.");
  }

  const registration = await ensurePushServiceWorkerRegistration();

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(pushConfig.publicKey),
    });
  }

  await savePushSubscription(toSerializableSubscription(subscription), token);
  return true;
}

export async function unsubscribeCurrentBrowserFromPush(token?: string | null) {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!registration) {
    return false;
  }

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return false;
  }

  const endpoint = subscription.endpoint;

  if (endpoint) {
    await deletePushSubscription(endpoint, token).catch(() => undefined);
  }

  await subscription.unsubscribe().catch(() => false);
  return true;
}
