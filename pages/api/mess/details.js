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

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;

    if (!messId) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        name,
        email,
        location,
        logo,
        contact_info,
        rating
      FROM messes
      WHERE id = $1
      `,
      [messId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Mess not found" });
    }

    return res.status(200).json(rows[0]);

  } catch (error) {
    console.error("Mess details error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}