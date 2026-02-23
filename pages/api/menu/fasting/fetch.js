// pages/api/menu/fasting/fetch.js
import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ====================================================
  // 🔐 STRICT TOKEN VALIDATION
  // ====================================================
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  // ====================================================
  // 📌 DB FETCH — STRICT messId FILTERING
  // ====================================================
  const client = await pgPool.connect();
  try {
    // Get fasting request details
    const fastingQuery = `
      SELECT 
        u.name,
        u.phone,
        TO_CHAR(fr.fasting_date, 'YYYY-MM-DD') AS fasting_date
      FROM fasting_requests fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.mess_id = $1
      AND fr.fasting_date BETWEEN CURRENT_DATE - INTERVAL '7 days'
                           AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY fr.fasting_date DESC
    `;
    const fastingResult = await client.query(fastingQuery, [messId]);

    // Count fasting requests
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM fasting_requests
      WHERE mess_id = $1
    `;
    const countResult = await client.query(countQuery, [messId]);

    const totalRequests = Number(countResult.rows[0]?.total || 0);

    // Response
    return res.status(200).json({
      fastingRequests: fastingResult.rows,
      totalRequests,
    });

  } catch (err) {
    console.error("❌ Error fetching fasting requests:", err);
    return res.status(500).json({ error: "Failed to fetch fasting requests" });
  } finally {
    client.release();
  }
}
