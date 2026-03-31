// pages/api/accountDeletion/update.js
import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
   res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
 
  if (req.method !== "PATCH")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // 🔐 Must have token
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];
    const decoded = jwt.decode(token);

    if (!decoded?.messId)
      return res.status(401).json({ error: "Invalid token" });

    const messId = decoded.messId;
    const adminUser = decoded.email || "admin";

    const { id, status } = req.body;

    if (!id || !status)
      return res.status(400).json({ error: "id and status required" });

    // Validate status
    const valid = ["pending", "approved", "rejected", "completed"];
    if (!valid.includes(status))
      return res.status(400).json({ error: "Invalid status" });

    // Ensure status belongs to same mess
    const checkQuery = `
      SELECT adr.id
      FROM account_deletion_requests adr
      JOIN users u ON adr.user_id = u.id
      WHERE adr.id = $1 AND u.mess_id = $2
    `;
    const check = await pgPool.query(checkQuery, [id, messId]);

    if (check.rows.length === 0)
      return res.status(404).json({ error: "Not found" });

    const updateQuery = `
      UPDATE account_deletion_requests
      SET status = $1,
          processed_at = NOW(),
          processed_by = $2
      WHERE id = $3
      RETURNING *
    `;

    const { rows } = await pgPool.query(updateQuery, [status, adminUser, id]);

    return res.json({ ok: true, data: rows[0] });

  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
