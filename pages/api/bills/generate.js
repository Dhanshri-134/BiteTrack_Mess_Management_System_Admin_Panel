// pages/api/bills/generate.js
import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";
import { syncMonthlyAttendanceForMessMonth } from "../../../lib/monthlyAttendanceSync";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized. Login again.",
      code: "NO_TOKEN",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      error: "Session expired. Please login again.",
      code: "AUTH_EXPIRED",
    });
  }

  const messId = decoded?.messId;
  if (!messId) {
    return res.status(403).json({
      error: "Invalid session. Missing mess ID.",
      code: "INVALID_MESS",
    });
  }

  const { year: inputYear, month: inputMonth } = req.body || {};
  const now = new Date();
  const year = Number(inputYear || now.getFullYear());
  const month = Number(inputMonth || now.getMonth() + 1);

  const client = await pgPool.connect();

  try {
    await client.query("SET statement_timeout = 120000");

    const syncResult = await syncMonthlyAttendanceForMessMonth(client, {
      messId,
      year,
      month,
    });

    return res.status(200).json({
      ok: syncResult.failed.length === 0,
      message: "Monthly attendance synced for billing.",
      year,
      month,
      total_users: syncResult.totalUsers,
      synced_users: syncResult.syncedCount,
      deleted_month_rows: syncResult.deletedCount,
      failed_user_ids: syncResult.failed.map((entry) => entry.userId),
    });
  } catch (error) {
    console.error("Billing generation sync error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  } finally {
    client.release();
  }
}
