

// // pages/api/superadmin-notifications.js
// import { pgPool } from "@/lib/db";
// import { verifyToken } from "@/lib/auth";

// export default async function handler(req, res) {
//   let decoded;

//   // 1) Validate Token using your existing verifyToken(req)
//   try {
//     decoded = verifyToken(req);  
//   } catch (err) {
//     console.log("❌ Token validation failed:", err.message);
//     return res.status(401).json({ ok: false, message: "Unauthorized" });
//   }

//   // allow both mess_id and messId
//   const mess_id = decoded.mess_id || decoded.messId;

//   if (!mess_id) {
//     console.log("❌ Missing mess_id in decoded token →", decoded);
//     return res.status(401).json({ ok: false, message: "Login again" });
//   }

//   // ------------------------------------------
//   // GET → Fetch notifications for this mess
//   // ------------------------------------------
//   if (req.method === "GET") {
//     try {
//       const q = `
//         SELECT *
//         FROM superadmin_notifications
//         WHERE mess_id = $1
//         ORDER BY created_at DESC
//       `;
//       const result = await pgPool.query(q, [mess_id]);
//       return res.status(200).json(result.rows);
//     } catch (err) {
//       console.error("❌ DB ERROR GET:", err);
//       return res.status(500).json({ ok: false, message: err.message });
//     }
//   }

//   // ------------------------------------------
//   // DELETE → Mark as seen (delete for this mess)
//   // ------------------------------------------
//   if (req.method === "DELETE") {
//     const { id } = req.query;

//     if (!id)
//       return res.status(400).json({ ok: false, message: "ID required" });

//     try {
//       await pgPool.query(
//         `DELETE FROM superadmin_notifications WHERE id = $1 AND mess_id = $2`,
//         [id, mess_id]
//       );

//       return res.status(200).json({ ok: true, message: "Removed" });
//     } catch (err) {
//       console.error("❌ DB ERROR DELETE:", err);
//       return res.status(500).json({ ok: false, message: err.message });
//     }
//   }

//   return res.status(405).json({ ok: false, message: "Method Not Allowed" });
// }




// pages/api/superadmin-notifications.js
import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const { method } = req;

  // -------------------------------
  // 🔐 VERIFY TOKEN FROM HEADER
  // -------------------------------
  let tokenMessId = null;

  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ ok: false, message: "Token missing. Login again." });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    if (!decoded?.messId) {
      return res.status(401).json({ ok: false, message: "messId missing in token. Login again." });
    }

    tokenMessId = decoded.messId;
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Invalid or expired token. Login again." });
  }

  const messId = tokenMessId;

  // -------------------------------
  // GET → fetch notifications
  // -------------------------------
  if (method === "GET") {
    try {
      const q = `
        SELECT *
        FROM superadmin_notifications
        WHERE mess_id = $1
        ORDER BY created_at DESC
      `;
      const result = await pgPool.query(q, [messId]);
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error("❌ DB ERROR GET:", err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  }

  // -------------------------------
  // DELETE → mark as seen
  // -------------------------------
  if (method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ ok: false, message: "ID required" });

    try {
      await pgPool.query(
        `DELETE FROM superadmin_notifications WHERE id = $1 AND mess_id = $2`,
        [id, messId]
      );
      return res.status(200).json({ ok: true, message: "Removed" });
    } catch (err) {
      console.error("❌ DB ERROR DELETE:", err);
      return res.status(500).json({ ok: false, message: err.message });
    }
  }

  return res.status(405).json({ ok: false, message: "Method Not Allowed" });
}
