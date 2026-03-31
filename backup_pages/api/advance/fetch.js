import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { user_id, month, year } = req.query;

    if (!user_id || !month || !year) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // 1️⃣ Get mess_user_id
    const messUserQuery = `
      SELECT id AS mess_user_id
      FROM users
      WHERE id = $1
      AND mess_id = $2
      LIMIT 1
    `;

    const messUser = await pgPool.query(messUserQuery, [
      user_id,
      messId
    ]);

    if (messUser.rows.length === 0) {
      return res.status(404).json({ error: "User not found in this mess" });
    }

    const messUserId = messUser.rows[0].mess_user_id;

    // 2️⃣ Fetch advance
    const query = `
      SELECT *
      FROM advance_payments
      WHERE mess_user_id = $1
      AND mess_id = $2
      AND month = $3
      AND year = $4
      LIMIT 1
    `;

    const { rows } = await pgPool.query(query, [
      messUserId,
      messId,
      month,
      year
    ]);

    res.status(200).json(rows[0] || null);

  } catch (err) {
    console.error("Advance fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
}