// lib/queueAction.js
import { getLocalDB } from "./localDB";

export async function queueAction(action) {
  const db = getLocalDB();
  if (!db) return;

  await (await db).add("queue", {
    ...action,
    createdAt: Date.now(),
  });
}
