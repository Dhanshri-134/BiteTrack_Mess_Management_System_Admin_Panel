import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "DELETE") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("Invalid token:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing user ID" });

 try {
  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // ✅ Verify user belongs to this mess
    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND mess_id = $2`,
      [id, messId]
    );

    if (userCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found in your mess" });
    }

    // 🔥 DELETE FROM ALL REFERENCING TABLES

    const tables = [
      "account_deletion_requests",
      "attendance",
      "authentication",
      "bills",
      "cash_payments",
      "daily_payment_requests",
      "fasting_requests",
      "feedback",
      "function_bookings",
      "leave_requests",
      "monthly_attendance",
      "notifications",
      "parents",
      "password_reset_codes",
      "payment_verifications",
      "ratings",
      "user_cravings",
      "verification_codes",
      "Owner_Marked_attendance"
    ];

    for (const table of tables) {
      await client.query(`DELETE FROM "${table}" WHERE user_id = $1`, [id]);
    }

    await client.query(
      `UPDATE users SET is_active = false WHERE id = $1`,
      [id]
    );

    await client.query("COMMIT");

    res.status(200).json({ ok: true });

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

} catch (err) {
  console.error("Error clearing user data:", err);
  res.status(500).json({ error: "Internal server error" });
}
}
