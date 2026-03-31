import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader(
  'Access-Control-Allow-Methods',
  'GET, POST, PUT, OPTIONS'
);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;
    if (!messId) return res.status(401).json({ error: "Invalid token. messId missing." });

    const { id, verification_status, verified_by, rejection_reason } = req.body;
    if (!id || !verification_status) return res.status(400).json({ error: "id and verification_status required" });

    // Update payment verification status
    const updateQuery = `
      UPDATE payment_verifications
      SET verification_status = $1,
          verified_at = now(),
          verified_by = $2,
          rejection_reason = $3
      WHERE id = $4 AND mess_id = $5
      RETURNING *
    `;
    const { rows } = await pgPool.query(updateQuery, [verification_status, verified_by || null, rejection_reason || null, id, messId]);

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("🔥 Error in /api/payment-verifications/update:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
}
