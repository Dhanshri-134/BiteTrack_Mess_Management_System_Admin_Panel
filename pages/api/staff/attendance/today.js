import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;

    const today = new Date().toISOString().split("T")[0];

    const result = await pgPool.query(
      `SELECT
        a.id,
        a.staff_id,
        s.name,
        s.phone,
        a.check_in,
        a.check_out,
        CASE
          WHEN a.attendance_type IN ('WO', 'WEEKLY_OFF') THEN 'OFF'
          WHEN a.attendance_type = 'H' THEN 'HF'
          ELSE a.attendance_type
        END AS attendance_type,
        a.is_late,
        a.late_minutes,
        a.overtime_hours,
        a.overtime_amount,
        a.penalty_amount,
        a.work_minutes,
        a.notes
      FROM staff_attendance a
      JOIN staff s ON s.id=a.staff_id
      WHERE a.mess_id=$1
      AND a.attendance_date=$2`,
      [messId, today]
    );

    res.json({ success: true, data: result.rows });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
