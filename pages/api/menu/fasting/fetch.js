// // pages/api/menu/fasting/fetch.js
// import { pgPool } from "@/lib/db";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "GET")
//     return res.status(405).json({ error: "Method not allowed" });

//   const authHeader = req.headers.authorization;
//   if (!authHeader?.startsWith("Bearer "))
//     return res.status(401).json({ error: "Unauthorized: token required" });

//   let decoded;
//   try {
//     const token = authHeader.split(" ")[1];
//     decoded = jwt.verify(token, process.env.JWT_SECRET);
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }

//   const messId = decoded.messId;
//   if (!messId) return res.status(400).json({ error: "messId missing in token" });

//   const client = await pgPool.connect();
//   try {
//     // Fetch actual fasting requests
//     const query = `
//       SELECT 
//         u.name,
//         u.phone,
//         fr.fasting_date
//       FROM fasting_requests fr
//       JOIN users u
//         ON fr.user_id = u.id
//       WHERE fr.mess_id = $1
//       ORDER BY fr.fasting_date DESC
//     `;
//     const result = await client.query(query, [messId]);

//     // Count of fasting requests
//     const countQuery = `
//       SELECT COUNT(*) AS total
//       FROM fasting_requests
//       WHERE mess_id = $1
//     `;
//     const countResult = await client.query(countQuery, [messId]);
//     const totalRequests = Number(countResult.rows[0].total || 0);

//     res.status(200).json({ fastingRequests: result.rows, totalRequests });
//   } catch (err) {
//     console.error("❌ Error fetching fasting requests:", err);
//     res.status(500).json({ error: "Failed to fetch fasting requests" });
//   } finally {
//     client.release();
//   }
// }





// // pages/api/fasting/fetch.js
// import { pgPool } from "@/lib/db";
// import { verifyToken } from "@/lib/auth";

// export default async function handler(req, res) {
//   if (req.method !== "GET")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     let mess_id = null;

//     // 🔐 Try to decode token (but do NOT block if missing)
//     try {
//       const decoded = verifyToken(req);
//       mess_id = decoded?.messId || null;
//     } catch (err) {
//       console.log("⚠️ No valid token, falling back to fetch ALL (old behavior)");
//     }

//     const client = await pgPool.connect();

//     // 📌 Base query
//     let query = `
//       SELECT fr.*, u.username, u.email
//       FROM fasting_requests fr
//       LEFT JOIN users u ON fr.user_id = u.id
//     `;
//     let queryParams = [];

//     // 📌 Apply mess_id filter ONLY when token exists
//     if (mess_id) {
//       query += ` WHERE fr.mess_id = $1`;
//       queryParams.push(mess_id);
//     }

//     query += ` ORDER BY fr.created_at DESC`;

//     const result = await client.query(query, queryParams);

//     // 📌 Count query
//     let countQuery = `
//       SELECT status, COUNT(*)
//       FROM fasting_requests
//     `;
//     let countParams = [];

//     if (mess_id) {
//       countQuery += ` WHERE mess_id = $1`;
//       countParams.push(mess_id);
//     }

//     countQuery += ` GROUP BY status`;

//     const countResult = await client.query(countQuery, countParams);

//     client.release();

//     const counts = { pending: 0, approved: 0, rejected: 0 };
//     countResult.rows.forEach((row) => {
//       counts[row.status] = Number(row.count);
//     });

//     res.status(200).json({
//       requests: result.rows,
//       counts,
//     });

//   } catch (error) {
//     console.error("❌ Error fetching fasting requests:", error);
//     res.status(500).json({ error: "Failed to fetch fasting requests" });
//   }
// }
// pages/api/menu/fasting/fetch.js
import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ====================================================
  // 🔐 STRICT TOKEN VALIDATION
  // ====================================================
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
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
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  // ====================================================
  // 📌 DB FETCH — STRICT messId FILTERING
  // ====================================================
  const client = await pgPool.connect();
  try {
    // Get fasting request details
    const fastingQuery = `
      SELECT 
        u.name,
        u.phone,
        fr.fasting_date
      FROM fasting_requests fr
      JOIN users u ON fr.user_id = u.id
      WHERE fr.mess_id = $1
      ORDER BY fr.fasting_date DESC
    `;
    const fastingResult = await client.query(fastingQuery, [messId]);

    // Count fasting requests
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM fasting_requests
      WHERE mess_id = $1
    `;
    const countResult = await client.query(countQuery, [messId]);

    const totalRequests = Number(countResult.rows[0]?.total || 0);

    // Response
    return res.status(200).json({
      fastingRequests: fastingResult.rows,
      totalRequests,
    });

  } catch (err) {
    console.error("❌ Error fetching fasting requests:", err);
    return res.status(500).json({ error: "Failed to fetch fasting requests" });
  } finally {
    client.release();
  }
}
