import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

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

  try {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;

    const { staff_id, month, year } = req.body;

    let query = `
      SELECT 
        a.id,
        a.staff_id,
        a.attendance_date,
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
        a.notes,
        s.name
      FROM staff_attendance a
      JOIN staff s ON s.id = a.staff_id
      WHERE a.mess_id=$1
      AND EXTRACT(MONTH FROM attendance_date)=$2
      AND EXTRACT(YEAR FROM attendance_date)=$3
    `;

    const values = [messId, month, year];

    if (staff_id) {
      query += " AND a.staff_id=$4";
      values.push(staff_id);
    }

    query += " ORDER BY attendance_date DESC";

    const result = await pgPool.query(query, values);

    res.json({ success: true, data: result.rows });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
