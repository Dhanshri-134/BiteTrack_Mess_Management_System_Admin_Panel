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
      id,
      name,
      phone,
      role,
      joining_date,
      salary_type,
      base_salary,
      overtime_rate,
      late_penalty,
      current_balance,
      shift_start,
      late_after,
      shift_end
    } = req.body;

    await pgPool.query(
      `UPDATE staff
       SET name=$1,
           phone=$2,
           role=$3,
           joining_date=$4,
           salary_type=$5,
           base_salary=$6,
           overtime_rate=$7,
           late_penalty=$8,
           current_balance=$9,
           shift_start=$10,
           late_after=$11,
           shift_end=$12,
           updated_at=NOW()
       WHERE id=$13 AND mess_id=$14`,
      [
        name,
        phone || null,
        role || null,
        joining_date || null,
        salary_type || "monthly",
        Number(base_salary) || 0,
        Number(overtime_rate) || 0,
        Number(late_penalty) || 0,
        Number(current_balance) || 0,
        shift_start || "09:00",
        late_after || "09:30",
        shift_end || "18:00",
        id,
        messId
      ]
    );

    res.json({ success: true });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
