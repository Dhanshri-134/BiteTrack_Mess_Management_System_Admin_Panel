
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";
import { normalizeAttendanceMap } from "../../../lib/attendanceMap";

export default async function handler(req, res) {


  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, year, month } = req.query;

  if (!userId || !year || !month) {
    return res.status(400).json({ error: "userId, year, and month are required" });
  }

  // ---------------------------------------------------
  // 1️⃣ JWT REQUIRED — no silent bypass
  // ---------------------------------------------------
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Extract messId ONLY from JWT
  const messId = decoded?.messId;
  if (!messId) {
    return res.status(401).json({ error: "messId missing in token" });
  }

  // ---------------------------------------------------
  // 2️⃣ Validate that user belongs to this mess
  // ---------------------------------------------------
  try {
    const userCheck = await pgPool.query(
      "SELECT id FROM users WHERE id=$1 AND mess_id=$2",
      [userId, messId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(403).json({
        error: "User does not belong to this mess",
      });
    }
  } catch (err) {
    console.error("User/mess validation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

 // ---------------------------------------------------
// 3️⃣ Fetch monthly attendance (LIVE from both tables)
// ---------------------------------------------------
try {
  const storedRes = await pgPool.query(
    `
    SELECT days_present, attendance_map, first_attendance_date
    FROM monthly_attendance
    WHERE user_id = $1
      AND mess_id = $2
      AND year = $3
      AND month = $4
    LIMIT 1
    `,
    [userId, messId, Number(year), Number(month)]
  );

  if (storedRes.rows.length > 0) {
    const row = storedRes.rows[0];
    return res.json({
      userId: Number(userId),
      year: Number(year),
      month: Number(month),
      days_present: Number(row.days_present || 0),
      attendance_map: normalizeAttendanceMap(row.attendance_map),
      first_attendance_date: row.first_attendance_date || null,
      source: "monthly_attendance",
    });
  }

  const attRes = await pgPool.query(
    `
    SELECT att_date
    FROM attendance
    WHERE user_id=$1
      AND mess_id=$4
      AND EXTRACT(YEAR FROM att_date)=$2
      AND EXTRACT(MONTH FROM att_date)=$3

    UNION ALL

    SELECT att_date
    FROM "Owner_Marked_attendance"
    WHERE user_id=$1
      AND mess_id=$4
      AND EXTRACT(YEAR FROM att_date)=$2
      AND EXTRACT(MONTH FROM att_date)=$3
    `,
    [userId, year, month, messId]
  );

  const attendance_map = {};

  for (const row of attRes.rows) {
    const dateStr = row.att_date.toISOString().slice(0, 10);
    attendance_map[dateStr] = true;
  }

  return res.json({
    userId: Number(userId),
    year: Number(year),
    month: Number(month),
    days_present: attRes.rows.length,
    attendance_map,
    source: "live_combined",
  });
} catch (err) {
  console.error("Monthly attendance error:", err);
  return res.status(500).json({ error: "Internal server error" });
}

}
