// pages/api/bookings/fetch.js
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
    // ----------------------------------------------------
    // 1️⃣ TOKEN REQUIRED → NO TOKEN = 401
    // ----------------------------------------------------
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    let messId = null;

    // ----------------------------------------------------
    // 2️⃣ VERIFY JWT → EXTRACT decoded.messId
    // ----------------------------------------------------
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      messId = decoded.messId; // ← EXACTLY AS YOU WANT
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // ----------------------------------------------------
    // 3️⃣ NO FALLBACK → messId MUST COME FROM JWT
    // ----------------------------------------------------
    if (!messId) {
      return res.status(400).json({ error: "messId missing in token" });
    }

    // ----------------------------------------------------
    // 4️⃣ FETCH BOOKINGS FOR THIS MESS ONLY
    // ----------------------------------------------------
    const query = `
      SELECT 
        fb.*,
        u.name AS user_name,
        u.email AS user_email,
        u.contact_no AS user_contact
      FROM function_bookings fb
      LEFT JOIN users u ON fb.user_id = u.id
      WHERE fb.mess_id = $1
      ORDER BY fb.created_at DESC
    `;

    const { rows } = await pgPool.query(query, [messId]);

    return res.status(200).json(rows);

  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    return res.status(500).json({ error: "Failed to fetch booking requests" });
  }
}




// // pages/api/bookings/fetch.js
// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth"; // your token verify function

// export default async function handler(req, res) {
//   try {
//     let mess_id = null;

//     // 1️⃣ Check token first (new logic)
//     const authHeader = req.headers.authorization;
//     if (authHeader) {
//       try {
//         const token = authHeader.split(" ")[1];
//         const decoded = verifyToken(token);
//         mess_id = decoded.mess_id; // extracted from token
//       } catch (e) {
//         console.log("⚠️ Invalid token:", e.message);
//       }
//     }

//     // 2️⃣ If no token mess_id → fallback to old system
//     if (!mess_id) {
//       mess_id = req.query.mess_id;
//     }

//     // 3️⃣ If still no mess_id → error
//     if (!mess_id) {
//       return res.status(400).json({ error: "mess_id is required" });
//     }

//     const query = `
//       SELECT 
//         fb.*,
//         u.name AS user_name,
//         u.email AS user_email,
//         u.contact_no AS user_contact
//       FROM function_bookings fb
//       LEFT JOIN users u ON fb.user_id = u.id
//       WHERE fb.mess_id = $1
//       ORDER BY fb.created_at DESC
//     `;

//     const { rows } = await pgPool.query(query, [mess_id]);

//     res.status(200).json(rows);

//   } catch (err) {
//     console.error("❌ Error fetching bookings:", err);
//     res.status(500).json({ error: "Failed to fetch booking requests" });
//   }
// }

