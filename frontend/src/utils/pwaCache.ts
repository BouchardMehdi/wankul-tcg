export type PwaCacheStatus = {
  shellEntries: number;
  runtimeEntries: number;
  cardImageEntries: number;
  cardImageLimit: number;
  version: string;
  timestamp?: number;
};

export type PwaCacheProgress = {
  cached: number;
  failed: number;
  total: number;
};

type CacheListener = (status: PwaCacheStatus) => void;
type ProgressListener = (progress: PwaCacheProgress) => void;

const statusListeners = new Set<CacheListener>();
const progressListeners = new Set<ProgressListener>();

let messageListenerInstalled = false;

function installMessageListener() {
  if (messageListenerInstalled || typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "wankul:cache-status" && event.data.payload) {
      statusListeners.forEach((listener) => listener(event.data.payload));
    }

    if (event.data?.type === "wankul:cache-progress" && event.data.payload) {
      progressListeners.forEach((listener) => listener(event.data.payload));
    }
  });

  messageListenerInstalled = true;
}

export function isPwaCacheSupported() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "caches" in window;
}

export async function getPwaServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service worker non supporté.");
  }

  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;

  return navigator.serviceWorker.register("/sw.js");
}

async function postToServiceWorker(message: unknown) {
  installMessageListener();
  const registration = await getPwaServiceWorkerRegistration();
  const target = navigator.serviceWorker.controller ?? registration.active ?? registration.waiting;

  if (!target) {
    throw new Error("Service worker pas encore actif.");
  }

  target.postMessage(message);
}

export async function requestPwaCacheStatus() {
  await postToServiceWorker({ type: "wankul:get-cache-status" });
}

export async function warmCardImageCache(urls: string[]) {
  await postToServiceWorker({
    type: "wankul:cache-card-images",
    payload: { urls },
  });
}

export async function clearCardImageCache() {
  await postToServiceWorker({ type: "wankul:clear-card-image-cache" });
}

export function subscribePwaCacheStatus(listener: CacheListener) {
  installMessageListener();
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function subscribePwaCacheProgress(listener: ProgressListener) {
  installMessageListener();
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}
