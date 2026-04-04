import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 Auth check
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
  if (!id) {
    return res.status(400).json({ error: "Missing user ID" });
  }

  try {
    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");

      const userCheck = await client.query(
        `SELECT id, is_active FROM users WHERE id = $1 AND mess_id = $2`,
        [id, messId]
      );

      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found in your mess" });
      }

      if (userCheck.rows[0].is_active === false) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "User already inactive" });
      }

      // 🔥 SOFT DELETE (IMPORTANT)
      await client.query(
        `UPDATE users
         SET 
           is_active = false,
           status = 'Inactive',
           updated_at = NOW()
         WHERE id = $1 AND mess_id = $2`,
        [id, messId]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        success: true,
        message: "User deactivated successfully"
      });

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Transaction error:", err);
      return res.status(500).json({ error: "Failed to deactivate user" });
    } finally {
      client.release();
    }

  } catch (err) {
    console.error("Connection error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}