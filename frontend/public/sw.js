const SHELL_CACHE = "wankul-shell-v7";
const RUNTIME_CACHE = "wankul-runtime-v3";
const CARD_IMAGE_CACHE = "wankul-card-images-v1";
const CARD_IMAGE_CACHE_LIMIT = 260;

const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.png",
  "/pwa-192.png",
  "/pwa-512.png",
  "/apple-touch-icon.png",
  "/push-market.svg",
  "/push-opening-soon.svg",
  "/push-opening.svg",
  "/push-recap.svg",
  "/push-stale-listing.svg",
  "/push-watchlist.svg",
];

function isCardImageRequest(request) {
  const url = new URL(request.url);
  return (
    request.destination === "image" &&
    (
      url.pathname.startsWith("/cards/") ||
      url.pathname.includes("/cards/") ||
      /Wankul_|placeholder/i.test(url.pathname)
    )
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;

  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function getCacheStatus() {
  const [shellCache, runtimeCache, cardCache] = await Promise.all([
    caches.open(SHELL_CACHE),
    caches.open(RUNTIME_CACHE),
    caches.open(CARD_IMAGE_CACHE),
  ]);

  const [shellKeys, runtimeKeys, cardKeys] = await Promise.all([
    shellCache.keys(),
    runtimeCache.keys(),
    cardCache.keys(),
  ]);

  return {
    shellEntries: shellKeys.length,
    runtimeEntries: runtimeKeys.length,
    cardImageEntries: cardKeys.length,
    cardImageLimit: CARD_IMAGE_CACHE_LIMIT,
    version: SHELL_CACHE,
    timestamp: Date.now(),
  };
}

async function postToClient(clientId, message) {
  if (!clientId) return;
  const client = await self.clients.get(clientId);
  client?.postMessage(message);
}

async function cacheCardImages(urls, clientId) {
  const uniqueUrls = Array.from(new Set((urls || []).filter(Boolean))).slice(
    0,
    CARD_IMAGE_CACHE_LIMIT,
  );
  const cache = await caches.open(CARD_IMAGE_CACHE);
  let cached = 0;
  let failed = 0;

  for (let index = 0; index < uniqueUrls.length; index += 1) {
    const url = uniqueUrls[index];

    try {
      const request = new Request(url, { mode: "no-cors", credentials: "omit" });
      const response = await fetch(request);
      if (response.ok || response.type === "opaque") {
        await cache.put(request, response);
        cached += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }

    if ((index + 1) % 12 === 0 || index === uniqueUrls.length - 1) {
      await postToClient(clientId, {
        type: "wankul:cache-progress",
        payload: {
          cached,
          failed,
          total: uniqueUrls.length,
        },
      });
    }
  }

  await trimCache(CARD_IMAGE_CACHE, CARD_IMAGE_CACHE_LIMIT);

  const status = await getCacheStatus();
  await postToClient(clientId, {
    type: "wankul:cache-status",
    payload: status,
  });

  return { cached, failed, total: uniqueUrls.length, status };
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE, CARD_IMAGE_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  if (type === "wankul:skip-waiting") {
    self.skipWaiting();
    return;
  }

  if (type === "wankul:cache-card-images") {
    event.waitUntil(cacheCardImages(payload?.urls || [], event.source?.id));
    return;
  }

  if (type === "wankul:clear-card-image-cache") {
    event.waitUntil(
      caches
        .delete(CARD_IMAGE_CACHE)
        .then(() => getCacheStatus())
        .then((status) =>
          postToClient(event.source?.id, {
            type: "wankul:cache-status",
            payload: status,
          }),
        ),
    );
    return;
  }

  if (type === "wankul:get-cache-status") {
    event.waitUntil(
      getCacheStatus().then((status) =>
        postToClient(event.source?.id, {
          type: "wankul:cache-status",
          payload: status,
        }),
      ),
    );
  }
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
          caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", responseClone));
          return response;
        })
        .catch(async () => {
          const cachedShell = await caches.match("/index.html");
          return cachedShell || caches.match("/offline.html");
        }),
    );
    return;
  }

  if (isCardImageRequest(event.request)) {
    event.respondWith(
      caches.open(CARD_IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok || response.type === "opaque") {
              cache.put(event.request, response.clone());
              trimCache(CARD_IMAGE_CACHE, CARD_IMAGE_CACHE_LIMIT);
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/assets/") || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => cachedResponse || caches.match("/offline.html"));

        return cachedResponse || networkFetch;
      }),
    );
  }
});
