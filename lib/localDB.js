// lib/localDB.js
import { openDB } from "idb";

let dbPromise = null;

export function getLocalDB() {
  if (typeof window === "undefined" ||
    !("indexedDB" in window)) {
    return null; // SSR safeguard
  }

  if (!dbPromise) {
    dbPromise = openDB("offline-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache");
        }
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", {  keyPath: "id",autoIncrement: true });
        }
      },
    });
  }

  return dbPromise;
}
