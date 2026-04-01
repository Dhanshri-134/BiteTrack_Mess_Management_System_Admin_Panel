// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method === "GET") {
//     try {
//       const result = await pgPool.query(
//         `SELECT 
//     u.id,
//     u.first_name,
//     u.last_name,
//     u.name,
//     u.email,
//     u.phone,
    
//     u.room_no,
//     u.hostel_name,
//     u.course,
//     u.date_of_joining,
//     u.verified,
//     u.created_at,
//     COALESCE(
//         json_agg(
//             json_build_object(
//                 'name', p.name,
//                 'contact', p.contact,
//                 'address', p.address
//             )
//         ) FILTER (WHERE p.id IS NOT NULL),
//         '[]'
//     ) AS parents
// FROM users u
// LEFT JOIN parents p ON p.user_id = u.id
// WHERE u.verified = false and u.mail_sent = true
// GROUP BY u.id
// ORDER BY u.created_at DESC;
// `
//       );
//       res.status(200).json(result.rows || []);
//     } catch (err) {
//       console.error("Error fetching unverified users:", err);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   } else if (req.method === "PUT") {
//     // mark user as verified
//     const { id } = req.body;
//     if (!id) return res.status(400).json({ error: "Missing user id" });

//     try {
//       await pgPool.query("UPDATE users SET verified=true WHERE id=$1", [id]);
//       res.status(200).json({ success: true });
//     } catch (err) {
//       console.error("Error verifying user:", err);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   } else {
//     return res.status(405).json({ error: "Method not allowed" });
//   }
// }
// pages/api/users/unverified.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // ------------------------
  // 🔐 Verify JWT
  // ------------------------
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

  // ------------------------
  // GET: fetch unverified users for this mess_id
  // ------------------------
  if (req.method === "GET") {
    try {
      const result = await pgPool.query(
        `
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.name,
          u.email,
          u.phone,
          u.room_no,
          u.hostel_name,
          u.course,
          u.date_of_joining,
          u.verified,
          u.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'name', p.name,
                'contact', p.contact,
                'address', p.address
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) AS parents
        FROM users u
        LEFT JOIN parents p ON p.user_id = u.id
        WHERE u.verified = false AND u.mail_sent = true AND u.mess_id = $1 AND u.status = 'Active'
        GROUP BY u.id
        ORDER BY u.created_at DESC
        `,
        [messId]
      );

      res.status(200).json(result.rows || []);
    } catch (err) {
      console.error("Error fetching unverified users:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  } 
  // ------------------------
  // PUT: mark user as verified
  // ------------------------
  else if (req.method === "PUT") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing user id" });

    try {
      // Only allow verifying users from the same mess
      const result = await pgPool.query(
        "UPDATE users SET verified = true WHERE id = $1 AND mess_id = $2 RETURNING *",
        [id, messId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found or not in your mess" });
      }

      res.status(200).json({ success: true, user: result.rows[0] });
    } catch (err) {
      console.error("Error verifying user:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  } 
  // ------------------------
  // Method not allowed
  // ------------------------
  else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
