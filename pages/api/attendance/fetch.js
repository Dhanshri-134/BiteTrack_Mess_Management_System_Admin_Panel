// pages/api/attendance/fetch.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", 'GET', 'OPTIONS');
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // 🔐 STRICT JWT REQUIRED
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;
    if (!messId) {
      return res.status(401).json({ error: "messId missing in token" });
    }

    // 📅 Current Month + Year
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const query = `
      SELECT 
        a.id,
        TO_CHAR(a.att_date, 'YYYY-MM-DD') AS att_date,
        a.user_id,
        u.name AS user_name,
        CASE 
          WHEN p.status = 'paid' THEN true 
          ELSE false 
        END AS paid
      FROM attendance a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN payment_history p 
        ON p.user_id = a.user_id
        AND (
          CASE
            WHEN p.month ~ '^[0-9]+$' THEN CAST(p.month AS INTEGER)
            ELSE EXTRACT(MONTH FROM TO_DATE(p.month, 'Month'))
          END
        ) = $2
        AND p.year = $3
        AND p.mess_id = $1
      WHERE a.mess_id = $1
      ORDER BY a.att_date DESC
    `;

    const { rows } = await pgPool.query(query, [
      messId,
      month,
      year,
    ]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error("Attendance fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
