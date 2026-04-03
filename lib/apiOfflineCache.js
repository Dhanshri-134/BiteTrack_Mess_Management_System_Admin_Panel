import { API_BASE } from "./api";

const RUNTIME_API_CACHE = "bite-track-api-runtime-v1";

function toAbsoluteUrl(input) {
  if (typeof window === "undefined") return "";

  if (typeof input === "string") {
    return new URL(input, window.location.origin).toString();
  }

  if (input instanceof Request) {
    return new URL(input.url, window.location.origin).toString();
  }

  return "";
}

function getMethod(input, init = {}) {
  if (init.method) return String(init.method).toUpperCase();
  if (input instanceof Request) return String(input.method || "GET").toUpperCase();
  return "GET";
}

function isApiUrl(url) {
  if (!url || typeof window === "undefined") return false;

  const parsed = new URL(url, window.location.origin);
  const apiBase = new URL(API_BASE, window.location.origin);

  if (parsed.pathname.startsWith("/api/")) return true;
  return parsed.origin === apiBase.origin && parsed.pathname.startsWith("/api/");
}

function getTokenKey() {
  if (typeof window === "undefined") return "guest";
  return localStorage.getItem("token") || "guest";
}

function hashValue(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return String(hash);
}

function buildCacheRequest(url) {
  const token = encodeURIComponent(hashValue(getTokenKey()));
  const encodedUrl = encodeURIComponent(url);
  return new Request(
    `${window.location.origin}/__offline_api_cache__?token=${token}&url=${encodedUrl}`,
    { method: "GET" }
  );
}

export function installApiOfflineCache() {
  if (typeof window === "undefined" || typeof caches === "undefined") {
    return () => {};
  }

  if (window.__BITE_TRACK_API_CACHE_INSTALLED__) {
    return () => {};
  }

  const originalFetch = window.fetch.bind(window);
  window.__BITE_TRACK_API_CACHE_INSTALLED__ = true;

  window.fetch = async (input, init = {}) => {
    const method = getMethod(input, init);
    const absoluteUrl = toAbsoluteUrl(input);

    if (method !== "GET" || !isApiUrl(absoluteUrl)) {
      return originalFetch(input, init);
    }

    const cache = await caches.open(RUNTIME_API_CACHE);
    const cacheRequest = buildCacheRequest(absoluteUrl);

    try {
      const response = await originalFetch(input, init);
      if (response && response.ok) {
        await cache.put(cacheRequest, response.clone());
      }
      return response;
    } catch (error) {
      const cachedResponse = await cache.match(cacheRequest);
      if (cachedResponse) {
        return cachedResponse.clone();
      }
      throw error;
    }
  };

  return () => {
    window.fetch = originalFetch;
    window.__BITE_TRACK_API_CACHE_INSTALLED__ = false;
  };
}
