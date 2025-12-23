// // pages/api/feedback/fetch.js
// import { pgPool } from "@/lib/db";
// import { verifyToken } from "@/lib/auth";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     let mess_id = null;

//     // 🔐 Prefer token
//     if (req.headers.authorization?.startsWith("Bearer ")) {
//       try {
//         const token = req.headers.authorization.split(" ")[1];
//         const decoded = verifyToken({ headers: { authorization: `Bearer ${token}` } });
//         mess_id = decoded?.messId || null;
//       } catch (err) {
//         console.log("Invalid token, ignoring.");
//       }
//     }

//     // Fallback to query param if no token
//     if (!mess_id && req.query.mess_id) {
//       mess_id = Number(req.query.mess_id);
//     }

//     const baseQuery = `
//       SELECT f.*, u.name AS user_name, u.email AS user_email
//       FROM feedback f
//       LEFT JOIN users u ON f.user_id = u.id
//     `;

//     const query = mess_id
//       ? baseQuery + " WHERE f.mess_id = $1 ORDER BY f.created_at DESC"
//       : baseQuery + " ORDER BY f.created_at DESC";

//     const params = mess_id ? [mess_id] : [];

//     const { rows } = await pgPool.query(query, params);

//     res.status(200).json(rows);
//   } catch (error) {
//     console.error("❌ Error fetching feedback:", error);
//     res.status(500).json({ error: "Failed to fetch feedback" });
//   }
// }
// pages/api/feedback/fetch.js
import { pgPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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

  try {
    // 🔐 Token is mandatory (your rule)
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized - token missing" });
    }

    let decoded;
    try {
      decoded = verifyToken(req); // your auth.js requires full req
    } catch (err) {
      console.log("❌ Invalid token:", err.message);
      return res.status(401).json({ error: "Invalid token - login again" });
    }

    const mess_id = decoded.messId; // EXACT field from your JWT
    if (!mess_id) {
      return res.status(401).json({ error: "mess_id missing in token" });
    }

    // ------------------------------
    // Fetch feedback for this mess
    // ------------------------------
    const query = `
      SELECT f.*, u.name AS user_name, u.email AS user_email
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.mess_id = $1
      ORDER BY f.created_at DESC
    `;

    const { rows } = await pgPool.query(query, [mess_id]);

    return res.status(200).json(rows);

  } catch (error) {
    console.error("❌ Error fetching feedback:", error);
    return res.status(500).json({ error: "Failed to fetch feedback" });
  }
}
