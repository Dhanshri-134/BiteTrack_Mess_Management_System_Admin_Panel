
// // lib/offlineFetch.js
// import { getLocalDB } from "./localDB";

// export async function offlineFetch(key, fetcher) {
  
//   const db = getLocalDB();
//   if (db) {
//     const cached = await (await db).get("cache", key);
//     if (cached) {
//       // 🔁 Background refresh (do NOT await)
//       refreshCacheInBackground(key, fetcher);
//       return cached; // 🚀 instant return
//     }
//   }
//   try {
//     const data = await fetcher();

//     // ✅ DO NOT cache invalid or error-shaped responses
//     if (
//       data &&
//       typeof data === "object" &&
//       !data.error &&
//       !data.errors
//     ) {
//       const db = getLocalDB();
//       if (db) {
//         await (await db).put("cache", data, key);
//       }
//     }

//     return data;
//   } catch (err) {
//     const db = getLocalDB();
//     if (!db) throw err;

//     const cached = await (await db).get("cache", key);
//     if (cached) return cached;

//     throw err;
//   }
// }


// // 🔁 Silent background updater
// async function refreshCacheInBackground(key, fetcher) {
//   try {
//     const data = await fetcher();

//     if (
//       data &&
//       typeof data === "object" &&
//       !data.error &&
//       !data.errors
//     ) {
//       const db = getLocalDB();
//       if (db) {
//         await (await db).put("cache", data, key);
//       }
//     }
//   } catch {
//     // offline / error → ignore silently
//   }
// }




// lib/offlineFetch.js
import { getLocalDB } from "./localDB";
import { isRefreshing } from "./refreshBus";

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
  } catch (err) {
    // fallback to cache ONLY if not refreshing
    if (!refreshing && db) {
      const cached = await (await db).get("cache", key);
      if (cached) return cached;
    }
    throw err;
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
