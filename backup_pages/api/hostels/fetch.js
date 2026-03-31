import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  // 🔥 CORS — ALWAYS FIRST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔐 AUTH
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let messId;
  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    messId = decoded.messId;
    if (!messId) throw new Error();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    const { rows } = await pgPool.query(
      `
      SELECT id, name
      FROM hostels
      WHERE mess_id = $1
        AND is_active = true
      ORDER BY display_order, name
      `,
      [messId]
    );

    return res.status(200).json(rows);
  } catch (err) {
    console.error("🔥 hostels fetch error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
