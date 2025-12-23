import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ----------------------------------------------------
  // 1️⃣ TOKEN REQUIRED (NO FALLBACK)
  // ----------------------------------------------------
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: Token required" });
  }

  let messId;
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    messId = decoded.messId; // STRICT: use ONLY decoded.messId
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (!messId) {
    return res.status(400).json({ error: "Invalid token: messId missing" });
  }

  // ----------------------------------------------------
  // 2️⃣ Validate body
  // ----------------------------------------------------
  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: "Missing id or status" });
  }

  try {
    // ----------------------------------------------------
    // 3️⃣ SECURE UPDATE — MESS FILTER REQUIRED
    // ----------------------------------------------------
    const query = `
      UPDATE function_bookings fb
      SET status = $1, updated_at = NOW()
      FROM users u
      WHERE fb.id = $2
        AND fb.user_id = u.id
        AND u.mess_id = $3
      RETURNING fb.id;
    `;

    const params = [status, id, messId];

    const result = await pgPool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Booking not found in your mess",
      });
    }

    return res.status(200).json({
      message: "Booking status updated successfully",
    });

  } catch (err) {
    console.error("❌ Error updating booking status:", err);
    return res.status(500).json({ error: "Failed to update booking status" });
  }
}










// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   let messId = null;

//   // Try verifying token (optional)
//   try {
//     const decoded = verifyToken(req); // Bearer token
//     messId = decoded.messId;
//   } catch (err) {
//     messId = null; // fallback → no token
//   }

//   try {
//     const { id, status } = req.body;

//     if (!id || !status) {
//       return res.status(400).json({ error: "Missing id or status" });
//     }

//     let query;
//     let params;

//     // ----------------------------------------------------------
//     // SECURE MODE → token exists → update only inside same mess
//     // ----------------------------------------------------------
//     if (messId) {
//       query = `
//         UPDATE function_bookings fb
//         SET status = $1, updated_at = NOW()
//         FROM users u
//         WHERE fb.id = $2
//           AND fb.user_id = u.id
//           AND u.mess_id = $3
//         RETURNING fb.id;
//       `;
//       params = [status, id, messId];
//     } 
    
//     // ----------------------------------------------------------
//     // FALLBACK MODE → no token → old behavior (no mess filter)
//     // ----------------------------------------------------------
//     else {
//       query = `
//         UPDATE function_bookings
//         SET status = $1, updated_at = NOW()
//         WHERE id = $2
//         RETURNING id;
//       `;
//       params = [status, id];
//     }

//     const result = await pgPool.query(query, params);

//     if (result.rowCount === 0) {
//       return res.status(404).json({
//         error: messId ? "Booking not found in your mess" : "Booking not found",
//       });
//     }

//     return res
//       .status(200)
//       .json({ message: "Booking status updated successfully" });

//   } catch (err) {
//     console.error("Error updating booking status:", err);
//     return res.status(500).json({ error: "Failed to update booking status" });
//   }
// }
