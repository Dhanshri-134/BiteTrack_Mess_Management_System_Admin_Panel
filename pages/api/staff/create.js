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

    const {
      name,
      phone,
      role,
      joining_date,
      salary_type,
      base_salary,
      overtime_rate,
      late_penalty,
      shift_start,
      late_after,
      shift_end
    } = req.body;

    /* ---------------- VALIDATION ---------------- */

    if (!name) {
      return res.status(400).json({ error: "Staff name required" });
    }

    /* -------- SAFE DEFAULT SHIFT TIMES -------- */

    const shiftStart = shift_start || "09:00";
    const lateAfter = late_after || "09:30";
    const shiftEnd = shift_end || "18:00";

    const result = await pgPool.query(
      `INSERT INTO staff
      (
        mess_id,
        name,
        phone,
        role,
        joining_date,
        salary_type,
        base_salary,
        overtime_rate,
        late_penalty,
        shift_start,
        late_after,
        shift_end
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        messId,
        name,
        phone || null,
        role || null,
        joining_date || null,
        salary_type || "monthly",
        Number(base_salary) || 0,
        Number(overtime_rate) || 0,
        Number(late_penalty) || 0,
        shiftStart,
        lateAfter,
        shiftEnd
      ]
    );

    console.log("Staff Created:", result.rows[0].id);

    return res.json({
      success: true,
      id: result.rows[0].id
    });

  } catch (err) {

    console.error("Create Staff Error:", err);

    return res.status(500).json({
      error: "Server error"
    });

  }
}