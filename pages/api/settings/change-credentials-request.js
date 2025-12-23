// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ ok: false, message: "Method not allowed" });
//   }

//   const { email, verification, password } = req.body;

//   if (!email || !password) {
//     return res
//       .status(400)
//       .json({ ok: false, message: "Email and password are required." });
//   }

//   try {
//     // Example update query – adjust table name & columns to match your schema
//     const query = `
//       UPDATE mess_owners
//       SET email = $1,
//           password = crypt($2, gen_salt('bf')),
//           mail_sent = false,
//           verified = false,
//           updated_at = NOW()
//       WHERE id = 1
//       RETURNING id;
//     `;
//     const result = await pgPool.query(query, [email, password]);

//     if (result.rowCount > 0) {
//       res.status(200).json({ ok: true, message: "Change request submitted." });
//     } else {
//       res
//         .status(404)
//         .json({ ok: false, message: "Owner not found or update failed." });
//     }
//   } catch (err) {
//     console.error("Error updating credentials:", err);
//     res.status(500).json({ ok: false, message: "Internal server error." });
//   }
// }




import { pgPool } from "../../../lib/db";
import { verify } from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ ok: false, message: "Email and password are required." });
  }

  // ----------------------------------------
  // 🔐 TOKEN HANDLING (same pattern everywhere)
  // ----------------------------------------
  const token = req.headers.authorization?.split(" ")[1] || null;
  let mess_id = null;

  if (token) {
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      mess_id = decoded.mess_id || null;
    } catch (err) {
      return res.status(401).json({ ok: false, message: "Invalid or expired token." });
    }
  }

  // If NO token → fallback to existing behavior (id = 1)
  const ownerId = mess_id || 1;

  try {
    const query = `
      UPDATE mess_owners
      SET 
        email = $1,
        password = crypt($2, gen_salt('bf')),
        mail_sent = false,
        verified = false,
        updated_at = NOW()
      WHERE mess_id = $3
      RETURNING id;
    `;

    const result = await pgPool.query(query, [email, password, ownerId]);

    if (result.rowCount > 0) {
      res.status(200).json({
        ok: true,
        message: "Change request submitted."
      });
    } else {
      res.status(404).json({
        ok: false,
        message: "Owner not found or update failed."
      });
    }
  } catch (err) {
    console.error("Error updating credentials:", err);
    res.status(500).json({ ok: false, message: "Internal server error." });
  }
}
