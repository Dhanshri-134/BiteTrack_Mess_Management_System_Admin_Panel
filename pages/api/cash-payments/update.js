// pages/api/cash-payments/update.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
  'Access-Control-Allow-Methods',
  'GET, POST, PUT, OPTIONS'
);

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // -----------------------------------------------
  // 🔐 Extract JWT + messId
  // -----------------------------------------------
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized: Token required" });
  }

  let decoded;
  try {
    const token = auth.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  const processed_by = decoded.email || null; // use logged-in email safely

  const { id, status, notes } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const query = `
      UPDATE cash_payments
      SET request_status = $1,
          processed_at = NOW(),
          processed_by = $2,
          notes = $3
      WHERE id = $4
        AND mess_id = $5
      RETURNING *;
    `;

    const { rows } = await pgPool.query(query, [
      status,
      processed_by,
      notes || null,
      id,
      messId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Payment not found or not authorized for this mess",
      });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("❌ Error updating cash payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}



// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   if (req.method !== "PUT") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   let messId;
//   try {
//     const decoded = verifyToken(req); // throws if invalid
//     messId = decoded.messId;
//   } catch (err) {
//     console.warn("⚠️ No valid token:", err.message);
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   const { id, status, notes } = req.body;
//   const processed_by = decoded.email; // optionally use logged-in user's email

//   if (!id || !status) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   try {
//     const query = `
//       UPDATE cash_payments
//       SET request_status = $1,
//           processed_at = NOW(),
//           processed_by = $2,
//           notes = $3
//       WHERE id = $4
//         AND mess_id = $5
//       RETURNING *;
//     `;

//     const { rows } = await pgPool.query(query, [status, processed_by, notes || null, id, messId]);

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Payment not found or not authorized" });
//     }

//     res.status(200).json(rows[0]);
//   } catch (error) {
//     console.error("Error updating cash payment:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// }
