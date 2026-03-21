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

    const { staff_id, month, year } = req.body;

    let query = `
      SELECT p.*, s.name as staff_name
      FROM staff_payments p
      JOIN staff s ON s.id = p.staff_id
      WHERE p.mess_id = $1
    `;
    const params = [messId];

    if (staff_id) {
      params.push(staff_id);
      query += ` AND p.staff_id = $${params.length}`;
    }

    if (month && year) {
      params.push(month);
      query += ` AND EXTRACT(MONTH FROM p.payment_date) = $${params.length}`;
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM p.payment_date) = $${params.length}`;
    }

    query += ` ORDER BY p.payment_date DESC`;

    const result = await pgPool.query(query, params);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
