function reloadApp() {
  window.location.reload();
}

function askWaitingWorkerToActivate(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage({ type: "wankul:skip-waiting" });
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
    reloadApp();
    return;
  }

  let reloaded = false;
  const reloadOnce = () => {
    if (reloaded) return;
    reloaded = true;
    reloadApp();
  };

  navigator.serviceWorker.addEventListener("controllerchange", reloadOnce, { once: true });

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration("/sw.js")) ||
      (await navigator.serviceWorker.register("/sw.js"));

    await registration.update();
    await waitForInstallingWorker(registration);
    askWaitingWorkerToActivate(registration);

    window.setTimeout(reloadOnce, 900);
  } catch {
    reloadOnce();
  }
}
