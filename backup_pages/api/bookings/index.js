
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // -------------------------------------------------------
  // 1️⃣ TOKEN REQUIRED — NO TOKEN → 401
  // -------------------------------------------------------
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: Token required" });
  }

  let messId;

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Use ONLY decoded.messId
    messId = decoded.messId;
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Still missing messId inside token = reject
  if (!messId) {
    return res.status(400).json({ error: "Invalid token payload: messId missing" });
  }

  // ===========================================================
  // 2️⃣ GET BOOKINGS (LIST)
  // ===========================================================
  if (req.method === "GET") {
    try {
      const query = `
        SELECT 
          fb.*,
          u.name AS user_name,
          u.email AS user_email
        FROM function_bookings fb
        LEFT JOIN users u ON fb.user_id = u.id
        WHERE fb.mess_id = $1
        ORDER BY fb.created_at DESC
      `;

      const { rows } = await pgPool.query(query, [messId]);
      return res.status(200).json(rows);
    } catch (err) {
      console.error("❌ Error fetching bookings:", err);
      return res.status(500).json({ error: "Failed to fetch bookings" });
    }
  }

  // ===========================================================
  // 3️⃣ PATCH BOOKING (Admin update)
  // ===========================================================
  else if (req.method === "PATCH") {
    try {
      const { id, status, notes, estimated_cost } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Booking ID is required" });
      }

      // Update only if booking is in the same mess
      const updateQuery = `
        UPDATE function_bookings fb
        SET 
          status = $1,
          notes = $2,
          estimated_cost = $3,
          updated_at = NOW()
        FROM users u
        WHERE fb.id = $4
          AND fb.user_id = u.id
          AND u.mess_id = $5
        RETURNING fb.*;
      `;

      const params = [status, notes, estimated_cost, id, messId];

      const { rows } = await pgPool.query(updateQuery, params);

      if (rows.length === 0) {
        return res.status(404).json({ error: "Booking not found in your mess" });
      }

      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error("❌ Error updating booking:", err);
      return res.status(500).json({ error: "Failed to update booking" });
    }
  }

  // ===========================================================
  // 4️⃣ Invalid HTTP Method
  // ===========================================================
  return res.status(405).json({ error: "Method not allowed" });
}







// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   let messId = null;

//   // -----------------------------
//   // 1️⃣ Try verifying token (optional)
//   // -----------------------------
//   try {
//     const decoded = verifyToken(req);
//     messId = decoded.messId; // token exists → secure mode
//   } catch (e) {
//     messId = null; // fallback mode → no mess filter
//   }

//   // ===========================================================
//   // 2️⃣ GET BOOKINGS (listing)
//   // ===========================================================
//   if (req.method === "GET") {
//     try {
//       let query;
//       let params;

//       if (messId) {
//         // SECURE MODE → Only fetch for same mess
//         query = `
//           SELECT fb.*, u.name AS user_name, u.email AS user_email
//           FROM function_bookings fb
//           LEFT JOIN users u ON fb.user_id = u.id
//           WHERE u.mess_id = $1
//           ORDER BY fb.created_at DESC
//         `;
//         params = [messId];
//       } else {
//         // FALLBACK MODE → Old behavior
//         query = `
//           SELECT fb.*, u.name AS user_name, u.email AS user_email
//           FROM function_bookings fb
//           LEFT JOIN users u ON fb.user_id = u.id
//           ORDER BY fb.created_at DESC
//         `;
//         params = [];
//       }

//       const { rows } = await pgPool.query(query, params);
//       return res.status(200).json(rows);
//     } catch (err) {
//       console.error("❌ Error fetching bookings:", err);
//       return res.status(500).json({ error: "Failed to fetch bookings" });
//     }
//   }

//   // ===========================================================
//   // 3️⃣ PATCH (Admin updating booking)
//   // ===========================================================
//   else if (req.method === "PATCH") {
//     try {
//       const { id, status, notes, estimated_cost } = req.body;

//       if (!id) {
//         return res.status(400).json({ error: "Booking ID is required" });
//       }

//       let updateQuery;
//       let params;

//       if (messId) {
//         // SECURE MODE → update only if booking belongs to your mess
//         updateQuery = `
//           UPDATE function_bookings fb
//           SET status = $1,
//               notes = $2,
//               estimated_cost = $3,
//               updated_at = NOW()
//           FROM users u
//           WHERE fb.id = $4
//             AND fb.user_id = u.id
//             AND u.mess_id = $5
//           RETURNING fb.*;
//         `;
//         params = [status, notes, estimated_cost, id, messId];
//       } else {
//         // FALLBACK MODE → old update logic
//         updateQuery = `
//           UPDATE function_bookings
//           SET status = $1,
//               notes = $2,
//               estimated_cost = $3,
//               updated_at = NOW()
//           WHERE id = $4
//           RETURNING *;
//         `;
//         params = [status, notes, estimated_cost, id];
//       }

//       const { rows } = await pgPool.query(updateQuery, params);

//       if (rows.length === 0) {
//         return res
//           .status(404)
//           .json({ error: messId ? "Booking not found in your mess" : "Booking not found" });
//       }

//       return res.status(200).json(rows[0]);
//     } catch (err) {
//       console.error("❌ Error updating booking:", err);
//       return res.status(500).json({ error: "Failed to update booking" });
//     }
//   }

//   // ===========================================================
//   // 4️⃣ Invalid Method
//   // ===========================================================
//   else {
//     return res.status(405).json({ error: "Method not allowed" });
//   }
// }
