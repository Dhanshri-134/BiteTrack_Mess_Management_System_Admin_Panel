import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const {
      user_id,
      month,
      year,
      advance_amount,
      payment_method,
      notes,
      action
    } = req.body;

    if (!user_id || !month || !year || !advance_amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Get mess_user_id from users table
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

    const amount = Number(advance_amount);

    const query = `
      INSERT INTO advance_payments
      (mess_user_id, mess_id, month, year, advance_amount, payment_method, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)

      ON CONFLICT (mess_user_id, mess_id, month, year)

      DO UPDATE SET
        advance_amount =
          CASE
            WHEN $8 = 'add'
            THEN advance_payments.advance_amount + $5
            ELSE advance_payments.advance_amount - $5
          END,
        payment_method = $6,
        notes = $7,
        updated_at = NOW()

      RETURNING *
    `;

    const { rows } = await pgPool.query(query, [
      messUserId,
      messId,
      month,
      year,
      amount,
      payment_method || null,
      notes || null,
      action
    ]);

    res.status(200).json(rows[0]);

  } catch (err) {
    console.error("Advance update error:", err);
    res.status(500).json({ error: "Server error" });
  }
}