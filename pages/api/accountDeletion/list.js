// pages/api/accountDeletion/list.js
import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
   res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
 
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // 🔐 Token required
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];
    const decoded = jwt.decode(token);

    if (!decoded?.messId)
      return res.status(401).json({ error: "Invalid token" });

    const messId = decoded.messId;

    const query = `
      SELECT adr.*, u.mess_id 
      FROM account_deletion_requests adr
      JOIN users u ON adr.user_id = u.id
      WHERE u.mess_id = $1
      ORDER BY adr.requested_at DESC
    `;

    const { rows } = await pgPool.query(query, [messId]);

    return res.json(rows);

  } catch (error) {
    console.error("List error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
