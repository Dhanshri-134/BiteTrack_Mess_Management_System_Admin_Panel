const CACHE_NAME = "bite-track-v1";
const API_CACHE_NAME = "bite-track-api-v1";

const ASSETS = [
  "/",                         // home
  "/manifest.json",
  "/Assets/logo_Bite_Track.png",

  // icons (ONLY if these files exist)
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn("Skipped caching:", url);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Intercept API requests (Network First, fallback to Cache)
  if (url.pathname.startsWith("/api/") || url.href.includes("vercel.app/api")) {
    if (event.request.method === "GET") {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            const clonedResponse = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, clonedResponse);
            });
            return response;
          })
          .catch(async () => {
             const cachedResponse = await caches.match(event.request);
             if (cachedResponse) {
               return cachedResponse;
             }
             // Optional: Return a custom offline response if needed
             throw new Error("Offline and no cache available for this API request");
          })
      );
    } else {
      // For POST/PUT/DELETE API requests, fetch directly (no cache fallback)
      event.respondWith(fetch(event.request));
    }
  } else {
    // Traditional cache-first strategy for static assets and HTML pages
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
});
