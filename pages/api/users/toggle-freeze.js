// // pages/api/users/toggle-freeze.js
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const { userId, action } = req.body;
//   if (!userId || !["freeze", "unfreeze"].includes(action)) {
//     return res.status(400).json({ error: "Invalid request" });
//   }

//   try {
//     let query;
//     if (action === "freeze") {
//   query = `
//     UPDATE users
//     SET status = 'Frozen',
//         freeze_date = CURRENT_DATE,
//         unfreeze_date = NULL
//     WHERE id = $1
//     RETURNING *;
//   `;
// } else {
//   query = `
//     UPDATE users
//     SET status = 'Active',
//         unfreeze_date = CURRENT_DATE
//     WHERE id = $1
//     RETURNING *;
//   `;
// }


//     const { rows } = await pgPool.query(query, [userId]);

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     res.status(200).json({ user: rows[0] });
//   } catch (err) {
//     console.error("Error toggling freeze:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }
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

  // ------------------------
  // 🔐 Check JWT token
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

  const { userId, action } = req.body;
  if (!userId || !["freeze", "unfreeze"].includes(action)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    // ------------------------
    // Ensure the user belongs to this mess
    // ------------------------
    const userCheck = await pgPool.query(
      `SELECT id FROM users WHERE id = $1 AND mess_id = $2`,
      [userId, messId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: "User not authorized" });
    }

    // ------------------------
    // Perform freeze/unfreeze
    // ------------------------
    let query;
    if (action === "freeze") {
      query = `
        UPDATE users
        SET status = 'Frozen',
            freeze_date = CURRENT_DATE,
            unfreeze_date = NULL
        WHERE id = $1
        RETURNING *;
      `;
    } else {
      query = `
        UPDATE users
        SET status = 'Active',
            unfreeze_date = CURRENT_DATE
        WHERE id = $1
        RETURNING *;
      `;
    }

    const { rows } = await pgPool.query(query, [userId]);

    res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error("Error toggling freeze:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
