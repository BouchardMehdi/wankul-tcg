const CACHE_NAME = "wankul-shell-v2";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.png",
  "/pwa-192.png",
  "/pwa-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("notificationclick", (event) => {
  const actionUrls = event.notification?.data?.actionUrls || {};
  const eventAction = event.action || "";
  const rawTargetUrl = actionUrls[eventAction] || event.notification?.data?.url || "/";
  const targetUrl = new URL(rawTargetUrl, self.location.origin).href;

  event.notification?.close();

  if (eventAction === "dismiss") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const [client] = clientList;

        return client
          .focus()
          .then(() => ("navigate" in client ? client.navigate(targetUrl) : client));
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "Wankul TCG",
      body: event.data ? event.data.text() : "",
    };
  }

  const {
    title = "Wankul TCG",
    body = "Une nouvelle notification est disponible.",
    url = "/",
    tag = "wankul-generic",
    kind = "generic",
    accent = "cyan",
    icon = "/pwa-192.png",
    badge = "/favicon.png",
    image = undefined,
    requireInteraction = false,
    vibrate = [90, 40, 90],
    actions = [],
  } = payload;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const enrichedPayload = {
        title,
        body,
        url,
        tag,
        kind,
        accent,
        icon,
        badge,
        image,
        requireInteraction,
        vibrate,
        actions,
      };

      clientList.forEach((client) => {
        client.postMessage({
          type: "wankul:push",
          payload: enrichedPayload,
        });
      });

      const hasFocusedClient = clientList.some((client) => client.focused);
      if (hasFocusedClient) {
        return undefined;
      }

      const actionUrls = {};
      actions.forEach((action) => {
        if (action?.action && action?.url) {
          actionUrls[action.action] = action.url;
        }
      });

      return self.registration.showNotification(title, {
        body,
        tag,
        icon,
        badge,
        image,
        actions,
        requireInteraction,
        renotify: true,
        timestamp: Date.now(),
        vibrate,
        data: {
          url,
          actionUrls,
          kind,
          accent,
        },
        lang: "fr-FR",
      });
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", responseClone));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (
            response.ok &&
            (url.pathname.startsWith("/assets/") || APP_SHELL.includes(url.pathname))
          ) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }

          return response;
        })
        .catch(() => caches.match("/index.html"));
    }),
  );
});
