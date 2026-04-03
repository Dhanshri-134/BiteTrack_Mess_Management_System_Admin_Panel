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

    const totalStaff = await pgPool.query(
      `SELECT COUNT(*) FROM staff WHERE mess_id=$1`,
      [messId]
    );

    const presentToday = await pgPool.query(
      `SELECT COUNT(*) 
       FROM staff_attendance
       WHERE mess_id=$1 AND attendance_date=$2
        AND attendance_type IN ('P','H','OT')`,
      [messId, today]
    );

    const lateToday = await pgPool.query(
      `SELECT COUNT(*) 
       FROM staff_attendance
       WHERE mess_id=$1 AND attendance_date=$2 AND is_late=true`,
      [messId, today]
    );

    const overtimeToday = await pgPool.query(
      `SELECT COUNT(*) 
       FROM staff_attendance
       WHERE mess_id=$1 AND attendance_date=$2 AND overtime_hours>0`,
      [messId, today]
    );

    res.json({
      total_staff: Number(totalStaff.rows[0].count),
      present_today: Number(presentToday.rows[0].count),
      late_today: Number(lateToday.rows[0].count),
      overtime_today: Number(overtimeToday.rows[0].count)
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
