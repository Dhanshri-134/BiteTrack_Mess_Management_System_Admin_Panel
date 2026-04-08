// pages/api/bills/update-attendance.js
import { getPgPool } from "../../../lib/db";
import { syncMonthlyAttendanceForDate } from "../../../lib/monthlyAttendanceSync";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pool = await getPgPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // get previous day as date (no time)
    const { rows: pd } = await client.query("SELECT (CURRENT_DATE - INTERVAL '1 day')::date AS prev_day");
    const prevDay = pd[0].prev_day;

    const affectedUsers = await client.query(
      `
      SELECT DISTINCT user_id, mess_id
      FROM (
        SELECT user_id, mess_id
        FROM attendance
        WHERE att_date = $1

        UNION ALL

        SELECT user_id, mess_id
        FROM "Owner_Marked_attendance"
        WHERE att_date = $1
      ) AS affected
      WHERE user_id IS NOT NULL
        AND mess_id IS NOT NULL
      ORDER BY mess_id ASC, user_id ASC
      `,
      [prevDay]
    );

    for (const row of affectedUsers.rows) {
      await syncMonthlyAttendanceForDate(client, {
        userId: row.user_id,
        messId: row.mess_id,
        attDate: prevDay,
      });
    }

    await client.query("COMMIT");
    return res.status(200).json({
      message: "Previous day monthly attendance synced.",
      processed_day: prevDay,
      synced_users: affectedUsers.rows.length,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating attendance:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  } finally {
    client.release();
  }
}
