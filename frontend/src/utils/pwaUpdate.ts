const APP_CACHE_PREFIXES = ["wankul-shell-", "wankul-runtime-"];

function reloadApp() {
  const url = new URL(window.location.href);
  url.searchParams.set("wankul_update", String(Date.now()));
  window.location.replace(url.toString());
}

function askWaitingWorkerToActivate(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage({ type: "wankul:skip-waiting" });
}

async function clearAppCaches() {
  if (!("caches" in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => APP_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
      .map((name) => caches.delete(name)),
  );
}

async function waitForInstallingWorker(registration: ServiceWorkerRegistration) {
  const installingWorker = registration.installing;
  if (!installingWorker) return;

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(resolve, 3500);

    installingWorker.addEventListener("statechange", () => {
      if (installingWorker.state === "installed") {
        window.clearTimeout(timeoutId);
        resolve();
      }
    });
  });
}

export async function requestPwaUpdate() {
  if (!("serviceWorker" in navigator)) {
    await clearAppCaches();
    reloadApp();
    return;
  }

  let reloaded = false;
  const reloadOnce = async () => {
    if (reloaded) return;
    reloaded = true;
    await clearAppCaches();
    reloadApp();
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => void reloadOnce(), { once: true });

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ||
      (await navigator.serviceWorker.register("/sw.js"));

    await registration.update();
    await waitForInstallingWorker(registration);
    askWaitingWorkerToActivate(registration);

    window.setTimeout(() => void reloadOnce(), 1200);
  } catch {
    await reloadOnce();
  }
}
