// // pages/api/users/names.js
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
//   const { userIds } = req.body;
//   if (!userIds || !userIds.length) return res.status(400).json({ error: "userIds required" });

//   try {
//     const { rows } = await pgPool.query(
//       "SELECT name FROM users WHERE id = ANY($1::int[])",
//       [userIds]
//     );
//     res.status(200).json({ names: rows.map(r => r.name) });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // if (req.method !== "POST")
  //   return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("Invalid token:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) return res.status(400).json({ error: "messId missing in token" });

  const { userIds } = req.body;
  if (!userIds || !userIds.length)
    return res.status(400).json({ error: "userIds required" });

  try {
    const { rows } = await pgPool.query(
      `SELECT name FROM users WHERE id = ANY($1::int[]) AND mess_id = $2`,
      [userIds, messId]
    );
    res.status(200).json({ names: rows.map(r => r.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
