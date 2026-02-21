
// lib/offlineFetch.js
import { getLocalDB } from "./localDB";
import { isRefreshing, resetRefresh } from "./refreshBus";


export async function offlineFetch(key, fetcher) {
  const db = getLocalDB();
  const refreshing = isRefreshing(); // 🔥 GLOBAL CHECK

  // ✅ cache-first ONLY when NOT refreshing
  if (!refreshing && db) {
    const cached = await (await db).get("cache", key);
    if (cached) {
      refreshCacheInBackground(key, fetcher);
      return cached;
    }
  }

  // 🔥 network fetch (normal OR refresh)
  try {
    const data = await fetcher();
    if (isRefreshing()) {
  resetRefresh();

}

    if (
      data &&
      typeof data === "object" &&
      !data.error &&
      !data.errors &&
      db
    ) {
      await (await db).put("cache", data, key);
    }

    return data;
  }
  //  catch (err) {
  //   // fallback to cache ONLY if not refreshing
  //   if (!refreshing && db) {
  //     const cached = await (await db).get("cache", key);
  //     if (cached) return cached;
  //   }
  //   throw err;
  // }
  catch (err) {
  if (db) {
    const cached = await (await db).get("cache", key);
    if (cached) return cached;
  }

  console.warn("offlineFetch failed, returning safe fallback:", key);
  return null; // ✅ DO NOT THROW
}
}

async function refreshCacheInBackground(key, fetcher) {
  try {
    const data = await fetcher();
    if (
      data &&
      typeof data === "object" &&
      !data.error &&
      !data.errors
    ) {
      const db = getLocalDB();
      if (db) {
        await (await db).put("cache", data, key);
      }
    }
  } catch {}
}
