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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;

    const today = new Date().toISOString().split("T")[0];

    const result = await pgPool.query(
      `SELECT
        a.id,
        s.name,
        a.check_in,
        a.check_out,
        a.is_late,
        a.overtime_hours,
        a.penalty_amount
      FROM staff_attendance a
      JOIN staff s ON s.id=a.staff_id
      WHERE a.mess_id=$1
      AND a.attendance_date=$2`,
      [messId, today]
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}