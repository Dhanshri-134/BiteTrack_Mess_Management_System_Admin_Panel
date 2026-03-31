import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { start } = req.query;

    if (!start) {
      return res.status(400).json({ error: "Start date required" });
    }

    // ✅ week range
    const startDate = new Date(start)
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 6);

    const endDateFormatted = endDate
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const { rows } = await pgPool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        ph.amount
      FROM payment_history ph
      JOIN users u ON u.id = ph.user_id
      WHERE ph.mess_id = $1
        AND ph.status = 'paid'
        AND DATE(ph.created_at AT TIME ZONE 'Asia/Kolkata') 
            BETWEEN $2 AND $3
      ORDER BY ph.amount DESC
      `,
      [messId, startDate, endDateFormatted]
    );

    res.json({ users: rows });

  } catch (err) {
    console.error("🔥 week-details error:", err);
    res.status(500).json({ error: "Server error" });
  }
}