import { pgPool } from "../../lib/db";
import { verifyToken } from "../../lib/auth";
import { syncMonthlyAttendanceForMessMonth } from "../../lib/monthlyAttendanceSync";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { year, month } = req.body || {};
  if (!year || !month) {
    return res.status(400).json({ error: "year and month required" });
  }

  let messId;
  try {
    const decoded = verifyToken(req);
    messId = decoded?.messId ?? decoded?.mess_id;
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!messId) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const client = await pgPool.connect();

  try {
    await client.query("SET statement_timeout = 120000");

    const syncResult = await syncMonthlyAttendanceForMessMonth(client, {
      messId,
      year: Number(year),
      month: Number(month),
    });

    return res.status(200).json({
      ok: syncResult.failed.length === 0,
      message: "Monthly attendance synced successfully",
      year: Number(year),
      month: Number(month),
      total_users: syncResult.totalUsers,
      synced_users: syncResult.syncedCount,
      deleted_month_rows: syncResult.deletedCount,
      failed_user_ids: syncResult.failed.map((entry) => entry.userId),
    });
  } catch (error) {
    console.error("Billing sync error:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
