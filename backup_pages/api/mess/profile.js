import { pgPool } from "../../../lib/db";

function decodeToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;

  const token = auth.split(" ")[1];
  if (!token) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    return payload;
  } catch {
    return null;
  }
}

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

  const decoded = decodeToken(req);

  if (!decoded || !decoded.messId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const messId = decoded.messId;

  try {
    const { rows } = await pgPool.query(
      `
      SELECT 
        m.id,
        m.name,
        m.image as owner_photo,
        m.secret_key
      FROM messes m
      WHERE m.id = $1
      LIMIT 1
      `,
      [messId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Mess not found" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Profile API error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
