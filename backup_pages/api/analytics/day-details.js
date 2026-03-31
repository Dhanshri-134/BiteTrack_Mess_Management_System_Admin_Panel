import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // ✅ IST NORMALIZATION
    const queryDate = new Date(date)
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
        AND DATE(ph.created_at AT TIME ZONE 'Asia/Kolkata') = $2
      ORDER BY ph.amount DESC
      `,
      [messId, queryDate]
    );

    return res.json({ users: rows });

  } catch (err) {
    console.error("🔥 day-details error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message
    });
  }
}