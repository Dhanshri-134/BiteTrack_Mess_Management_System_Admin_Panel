// // lib/queueAction.js
// import { getLocalDB } from "./localDB";

// export async function queueAction(action) {
//   const db = getLocalDB();
//   if (!db) return;

//   await (await db).add("queue", {
//     ...action,
//     createdAt: Date.now(),
//   });
// }


// lib/queueAction.js
import { getLocalDB } from "./localDB";

export async function queueAction(action) {
  try {
    if (!action?.type) return;

    const db = getLocalDB();
    if (!db) return;

    await (await db).add("queue", {
      ...action,
      status: "pending",
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn("queueAction failed safely:", err);
  }
}
