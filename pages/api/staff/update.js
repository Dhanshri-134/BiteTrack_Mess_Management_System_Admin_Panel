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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const {
      id,
      name,
      phone,
      role,
      base_salary,
      overtime_rate,
      late_penalty
    } = req.body;

    await pgPool.query(
      `UPDATE staff
       SET name=$1,
           phone=$2,
           role=$3,
           base_salary=$4,
           overtime_rate=$5,
           late_penalty=$6,
           updated_at=NOW()
       WHERE id=$7 AND mess_id=$8`,
      [
        name,
        phone,
        role,
        base_salary,
        overtime_rate,
        late_penalty,
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