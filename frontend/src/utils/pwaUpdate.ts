const APP_CACHE_PREFIXES = ["wankul-shell-", "wankul-runtime-"];
const UPDATE_RELOAD_PARAM = "wankul_update";

function reloadApp() {
  const url = new URL(window.location.href);
  url.searchParams.set(UPDATE_RELOAD_PARAM, String(Date.now()));
  window.location.replace(url.toString());
}

function askWaitingWorkerToActivate(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) return false;

  registration.waiting.postMessage({ type: "wankul:skip-waiting" });
  return true;
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

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.scope.startsWith(window.location.origin))
      .map((registration) => registration.unregister()),
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

async function waitForControllerChange(timeoutMs = 2500) {
  if (!("serviceWorker" in navigator)) return;

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(resolve, timeoutMs);

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.clearTimeout(timeoutId);
        resolve();
      },
      { once: true },
    );
  });
}

export async function requestPwaUpdate() {
  if (!("serviceWorker" in navigator)) {
    await clearAppCaches();
    reloadApp();
    return;
  }

  let finished = false;
  const finishUpdate = async () => {
    if (finished) return;
    finished = true;
    await clearAppCaches();
    await unregisterAppServiceWorkers();
    reloadApp();
  };

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ||
      (await navigator.serviceWorker.register("/sw.js"));

    await registration.update();
    await waitForInstallingWorker(registration);
    const activationRequested = askWaitingWorkerToActivate(registration);

    if (activationRequested) {
      await waitForControllerChange();
    }

    await finishUpdate();
  } catch {
    await finishUpdate();
  }
}
