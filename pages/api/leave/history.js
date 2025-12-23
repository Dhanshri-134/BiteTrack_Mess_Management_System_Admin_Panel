import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ------------------------------
    // 🔐 Validate JWT
    // ------------------------------
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const mess_id = decoded.messId;
    if (!mess_id) {
      return res.status(401).json({ error: "Missing mess_id in token" });
    }

    // ------------------------------
    // 📌 Fetch only Approved + Rejected history
    // ------------------------------
    const query = `
      SELECT *
      FROM leave_history
      WHERE mess_id = $1
        AND status IN ('Approved', 'Rejected')
      ORDER BY created_at DESC;
    `;

    const { rows } = await pgPool.query(query, [mess_id]);

    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching leave history:", err);
    res.status(500).json({ error: "Failed to fetch leave history" });
  }
}
