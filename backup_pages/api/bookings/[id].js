import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // -------------------------------
    // ⭐ 1. AUTH REQUIRED
    // -------------------------------
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const messId = decoded.messId;
    if (!messId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // -------------------------------
    // ⭐ 2. INPUTS
    // -------------------------------
    const { id } = req.query;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updateQuery = `
      UPDATE function_bookings
      SET status = $1, updated_at = NOW()
      WHERE id = $2
        AND mess_id = $3
      RETURNING *
    `;

    const { rows } = await pgPool.query(updateQuery, [status, id, messId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Booking not found in your mess" });
    }

    return res.status(200).json(rows[0]);

  } catch (err) {
    console.error("❌ Error updating booking:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
