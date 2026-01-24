// lib/offlineFetch.js
import { getLocalDB } from "./localDB";

export async function offlineFetch(key, fetcher) {
  try {
    const data = await fetcher();

    const db = getLocalDB();
    if (db) {
      await (await db).put("cache", data, key);
    }

    return data;
  } catch (err) {
    const db = getLocalDB();
    if (!db) throw err;

    const cached = await (await db).get("cache", key);
    if (cached) return cached;

    throw err;
  }
}

