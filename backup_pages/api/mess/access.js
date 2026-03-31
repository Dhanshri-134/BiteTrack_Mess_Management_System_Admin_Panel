import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
      res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;
    if (!messId) {
      return res.status(400).json({ error: "messId missing in token" });
    }

    const { rows } = await pgPool.query(
      `SELECT * FROM mess_access WHERE mess_id = $1 LIMIT 1`,
      [messId]
    );

    return res.status(200).json(rows[0] || {});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch mess access" });
  }
}