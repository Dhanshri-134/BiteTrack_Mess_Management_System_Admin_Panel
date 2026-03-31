// pages/api/daily-payments/fetch.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // 🔐 TOKEN REQUIRED
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let messId;
  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    messId = decoded.messId;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  try {
    const query = `
      SELECT d.*, u.name AS user_name, u.email
      FROM daily_payment_requests d
      JOIN users u ON u.id = d.user_id
      WHERE d.mess_id = $1
      ORDER BY d.requested_at DESC;
    `;

    const { rows } = await pgPool.query(query, [messId]);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Daily Payment Fetch Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
