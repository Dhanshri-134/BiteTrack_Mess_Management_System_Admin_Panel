// pages/api/cash-payments/fetch.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  try {
    // -----------------------------------------
    // 1️⃣ Token REQUIRED (Strict)
    // -----------------------------------------
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized: token required" });
    }

    let messId;
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      messId = decoded.messId; // STRICT: only from decoded token
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (!messId) {
      return res.status(400).json({ error: "messId missing in token" });
    }

    // -----------------------------------------
    // 2️⃣ Fetch data ONLY for this mess
    // -----------------------------------------
    const query = `
      SELECT 
        cp.*, 
        u.name AS user_name, 
        u.email
      FROM cash_payments cp
      JOIN users u ON cp.user_id = u.id
      WHERE u.mess_id = $1
      ORDER BY cp.requested_at DESC;
    `;

    const { rows } = await pgPool.query(query, [messId]);

    return res.status(200).json(rows);

  } catch (err) {
    console.error("❌ Error fetching cash payments:", err);
    return res.status(500).json({ error: "Failed to fetch cash payments" });
  }
}





// // pages/api/cash-payments/fetch.js
// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   try {
//     // Extract mess_id from token
//     let mess_id;
//     try {
//       const decoded = verifyToken(req);
//       mess_id = decoded.messId;
//     } catch (err) {
//       console.warn("⚠️ No valid token:", err.message);
//       return res.status(401).json({ error: "Unauthorized: token required" });
//     }

//     if (!mess_id) {
//       return res.status(400).json({ error: "mess_id not found in token" });
//     }

//     const query = `
//       SELECT cp.*, u.name AS user_name, u.email
//       FROM cash_payments cp
//       JOIN users u ON cp.user_id = u.id
//       WHERE u.mess_id = $1
//       ORDER BY cp.requested_at DESC;
//     `;

//     const { rows } = await pgPool.query(query, [mess_id]);
//     res.status(200).json(rows);
//   } catch (err) {
//     console.error("❌ Error fetching cash payments:", err);
//     res.status(500).json({ error: "Failed to fetch cash payments" });
//   }
// }
