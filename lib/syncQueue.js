// lib/syncQueue.js
import { getLocalDB } from "./localDB";

export async function syncQueue() {
  const dbPromise = getLocalDB();
  if (!dbPromise) return;

  const token = localStorage.getItem("token");
  if (!token) return; // 🔴 no auth → don't sync

  const database = await dbPromise;
  const tx = database.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");

  const allActions = await store.getAll();

   for (const action of allActions) {
    try {
      let res;

      // ===============================
      // ATTENDANCE SCAN (QR)
      // ===============================
      if (action.type === "ATTENDANCE_SCAN") {
        res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/mark/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.payload),
        });
      }

      // ===============================
      // OWNER MANUAL MARK
      // ===============================
      else if (action.type === "OWNER_ATTENDANCE_MARK") {
        res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/owner-mark/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.payload),
        });
      }

      // ===============================
      // OWNER DELETE
      // ===============================
      else if (action.type === "OWNER_ATTENDANCE_DELETE") {
        res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/delete/", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.payload),
        });
      }

      // Unknown type
      else {
        console.warn("Unknown queue action:", action.type);
        await store.delete(action.id);
        continue;
      }

      // ===============================
      // VALIDATE RESPONSE
      // ===============================
      if (!res || !res.ok) {
        console.error("Sync failed:", await res?.text());
        throw new Error("Sync failed");
      }


        // ✅ delete ONLY after server accepts
        await store.delete(action.id);
    } catch (err) {
      console.error("Stopping sync due to error:", err);
      break; // stop on first failure
    }
  }

  await tx.done;
}
