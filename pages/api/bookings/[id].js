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

    // -------------------------------
    // ⭐ 3. Check booking belongs to this mess
    // -------------------------------
    const checkQuery = `
      SELECT fb.id 
      FROM function_bookings fb
      WHERE id = $1 AND mess_id = $2
    `;
    const checkResult = await pgPool.query(checkQuery, [id, messId]);

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: "Not allowed for this mess" });
    }

    // -------------------------------
    // ⭐ 4. UPDATE booking
    // -------------------------------
    const updateQuery = `
      UPDATE function_bookings
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pgPool.query(updateQuery, [status, id]);
 console.log("CHECK RESULT:", checkResult.rows);
console.log("MESS ID:", messId);
console.log("BOOKING ID:", id);
    return res.status(200).json(rows[0]);

  } catch (err) {
    console.error("❌ Error updating booking:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
