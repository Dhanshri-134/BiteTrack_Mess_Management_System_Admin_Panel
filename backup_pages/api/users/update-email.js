// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "PUT") return res.status(405).end();

//   const { id, email, mail_sent = false, verified = false } = req.body;

//   if (!id || !email) return res.status(400).json({ error: "Missing user ID or email" });

//   try {
//     const result = await pgPool.query(
//       `UPDATE users
//        SET email = $2,
//            mail_sent = $3,
//            verified = $4
//        WHERE id = $1
//        RETURNING *`,
//       [id, email, mail_sent, verified]
//     );

//     if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

//     res.status(200).json({ ok: true, user: result.rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }



// pages/api/users/update.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
  if (!messId) return res.status(400).json({ error: "messId missing in token" });

  const { id, email, mail_sent = false, verified = false } = req.body;
  if (!id || !email) return res.status(400).json({ error: "Missing user ID or email" });

  try {
    const result = await pgPool.query(
      `UPDATE users
       SET email = $2,
           mail_sent = $3,
           verified = $4
       WHERE id = $1 AND mess_id = $5
       RETURNING *`,
      [id, email, mail_sent, verified, messId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found or not in your mess" });
    }

    res.status(200).json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
