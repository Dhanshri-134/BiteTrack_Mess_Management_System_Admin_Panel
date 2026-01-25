import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;
    if (!messId) return res.status(401).json({ error: "Invalid token. messId missing." });

    const query = `
      SELECT pv.*, u.name as user_name, u.email
      FROM payment_verifications pv
      JOIN users u ON u.id = pv.user_id
      WHERE pv.mess_id = $1
      ORDER BY pv.submitted_at DESC
    `;
    const { rows } = await pgPool.query(query, [messId]);

    res.status(200).json(rows);
  } catch (err) {
    console.error("🔥 Error in /api/payment-verifications/fetch:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
}
