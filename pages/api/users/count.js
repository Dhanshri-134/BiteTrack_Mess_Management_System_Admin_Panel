
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const client = await pgPool.connect();
//   try {
//     const result = await client.query(
//       `SELECT COUNT(*) AS count FROM users WHERE verified = true`
//     );
//     const count = parseInt(result.rows[0].count, 10);

//     res.status(200).json({ count });
//   } catch (err) {
//     console.error("Error fetching user count:", err);
//     res.status(500).json({ error: "Internal server error" });
//   } finally {
//     client.release();
//   }
// }



// pages/api/users/count.js
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

  // ----------------------------------------------
  // 🔐 REQUIRE TOKEN
  // ----------------------------------------------
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = auth.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  // ----------------------------------------------
  // 📌 QUERY VERIFIED USERS FOR THIS mess ONLY
  // ----------------------------------------------
  try {
    const result = await pgPool.query(
      `SELECT COUNT(*) AS count 
       FROM users 
       WHERE verified = true AND mess_id = $1`,
      [messId]
    );

    const count = parseInt(result.rows[0].count, 10);

    res.status(200).json({ count });
  } catch (err) {
    console.error("❌ Error fetching user count:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
