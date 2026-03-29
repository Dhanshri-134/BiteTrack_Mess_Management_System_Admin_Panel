import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;
    const { id, is_active } = req.body || {};

    if (!id || typeof is_active !== "boolean") {
      return res.status(400).json({ error: "Staff id and active status are required" });
    }

    const result = await pgPool.query(
      `UPDATE staff
       SET is_active=$1,
           updated_at=NOW()
       WHERE id=$2
         AND mess_id=$3
       RETURNING id, is_active`,
      [is_active, id, messId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
