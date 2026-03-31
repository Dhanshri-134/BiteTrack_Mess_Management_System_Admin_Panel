// pages/api/daily-payments/update.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
  'Access-Control-Allow-Methods',
  'GET, POST, PUT, OPTIONS'
);

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PUT")
    return res.status(405).json({ error: "Method not allowed" });

  const { id, status, processed_by } = req.body;

  if (!id || !status)
    return res.status(400).json({ error: "id and status are required" });

  let messIdFromToken = null;

  try {
    const auth = req.headers.authorization;
    if (auth) {
      const token = auth.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      messIdFromToken = decoded?.messId || null;
    }
  } catch (err) {
    console.error("JWT ERROR:", err);
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const updateQuery = `
      UPDATE daily_payment_requests
      SET 
        request_status = $1,
        processed_by = $2,
        processed_at = NOW()
      WHERE id = $3
      ${messIdFromToken ? "AND mess_id = $4" : ""}
      RETURNING *;
    `;

    const params = messIdFromToken
      ? [status, processed_by, id, messIdFromToken]
      : [status, processed_by, id];

    const result = await pgPool.query(updateQuery, params);

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Request not found" });

    return res.status(200).json({ ok: true, updated: result.rows[0] });
  } catch (err) {
    console.error("Daily Payment Update Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
