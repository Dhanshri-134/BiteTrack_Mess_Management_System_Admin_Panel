import { localDb } from "../localDB";

export async function markAttendanceOffline({
  user_id,
  mess_id,
  att_date,
}) {
  const db = await localDb;

  const record = {
    local_id: `${user_id}-${att_date}`, // prevents duplicates offline
    user_id,
    mess_id,
    att_date,
    created_at: new Date().toISOString(),
    synced: false,
  };

  // 1️⃣ Save locally
  await db.put("attendance", record);

  // 2️⃣ Add to sync queue
  await db.add("syncQueue", {
    table: "attendance",
    action: "upsert",
    payload: {
      user_id,
      mess_id,
      att_date,
    },
  });
}

export async function getLocalAttendance() {
  const db = await localDb;
  return db.getAll("attendance");
}
