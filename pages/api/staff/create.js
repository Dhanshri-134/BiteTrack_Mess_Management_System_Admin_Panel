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
    if (!token) return res.status(401).json({ error: "Token required" });

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
      late_penalty
    } = req.body;

    const result = await pgPool.query(
      `INSERT INTO staff
      (mess_id,name,phone,role,joining_date,salary_type,base_salary,overtime_rate,late_penalty)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id`,
      [
        messId,
        name,
        phone,
        role,
        joining_date,
        salary_type,
        base_salary,
        overtime_rate,
        late_penalty
      ]
    );
    console.log("Hitted")

    res.json({ success: true, id: result.rows[0].id });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}