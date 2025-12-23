import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    const { id, action } = req.body;

    if (!id || !action)
      return res.status(400).json({ message: "ID & Action required" });

    // ------------------------------
    // 🔐 Validate and decode token
    // ------------------------------
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "Unauthorized" });

    const token = auth.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const mess_id = decoded.messId;
    if (!mess_id)
      return res.status(401).json({ message: "Missing mess_id in token" });

    // ------------------------------
    // 🔄 Update leave request status
    // ------------------------------
    const query = `
      UPDATE leave_requests
      SET status = $1
      WHERE id = $2 AND mess_id = $3
      RETURNING *;
    `;

    const { rows } = await pgPool.query(query, [action, id, mess_id]);

    if (!rows.length)
      return res.status(404).json({ message: "Leave request not found" });

    res.status(200).json({
      ok: true,
      message: `Leave ${action} successfully`,
    });
  } catch (error) {
    console.error("Leave update error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
