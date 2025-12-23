// pages/api/attendance/fetch.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
   res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
 
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    let messId = null;

    // --------------------------
    // Extract token safely
    // --------------------------
    try {
      const auth = req.headers.authorization;   // ← You forgot this
      if (auth) {
        const token = auth.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

        if (!decoded?.messId) {
          return res.status(401).json({ ok: false, message: "messId missing in token." });
        }

        messId = decoded.messId;
      }
    } catch (err) {
      console.error("Token verification failed:", err);
    }

    let query;
    let params = [];

    // --------------------------
    // If token available → filter by mess
    // --------------------------
    if (messId) {
      query = `
        SELECT 
          a.id,
          TO_CHAR(a.att_date, 'YYYY-MM-DD') AS att_date,
          u.name AS user_name
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE u.mess_id = $1
        ORDER BY a.att_date DESC
      `;
      params = [messId];
    }

    // --------------------------
    // If no token → fallback to old behavior
    // --------------------------
    if (!messId) {
      query = `
        SELECT 
          a.id,
          TO_CHAR(a.att_date, 'YYYY-MM-DD') AS att_date,
          u.name AS user_name
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        ORDER BY a.att_date DESC
      `;
    }

    const { rows } = await pgPool.query(query, params);
    res.status(200).json(rows);

  } catch (err) {
    console.error("Attendance fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}



// // pages/api/attendance/fetch.js
// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   if (req.method !== "GET")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     let messId = null;

//     // Try token verification (but do NOT fail if token missing)
//     try {
//       const decoded = verifyToken(req);
//       messId = decoded.messId;
//     } catch (err) {
//       // No token provided → fallback to old behavior
//       messId = null;
//     }

//     let query;
//     let params = [];

//     if (messId) {
//       // Secure mess-specific filtering
//       query = `
//         SELECT 
//           a.id,
//           TO_CHAR(a.att_date, 'YYYY-MM-DD') AS att_date,
//           u.name AS user_name
//         FROM attendance a
//         JOIN users u ON u.id = a.user_id
//         WHERE u.mess_id = $1
//         ORDER BY a.att_date DESC
//       `;
//       params = [messId];
//     } else {
//       // Old behavior (no mess filter)
//       query = `
//         SELECT 
//           a.id,
//           TO_CHAR(a.att_date, 'YYYY-MM-DD') AS att_date,
//           u.name AS user_name
//         FROM attendance a
//         JOIN users u ON u.id = a.user_id
//         ORDER BY a.att_date DESC
//       `;
//     }

//     const { rows } = await pgPool.query(query, params);
//     res.status(200).json(rows);
//   } catch (err) {
//     console.error("Attendance fetch error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }
