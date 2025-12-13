// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "DELETE") return res.status(405).end();

//   const { id } = req.body;

//   if (!id) return res.status(400).json({ error: "Missing user ID" });

//   try {
//     const result = await pgPool.query(
//       `DELETE FROM users WHERE id = $1 RETURNING *;`, // ✅ correct SQL
//       [id] // ✅ pass id as parameter
//     );

//     if (result.rows.length === 0)
//       return res.status(404).json({ error: "User not found" });

//     res.status(200).json({ ok: true, deletedUser: result.rows[0] });
//   } catch (err) {
//     console.error("Error deleting user:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }

import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("Invalid token:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing user ID" });

  try {
    // ✅ Only delete user from the same mess
    const result = await pgPool.query(
      `DELETE FROM users 
       WHERE id = $1 AND mess_id = $2 
       RETURNING *;`,
      [id, messId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found or not in your mess" });
    }

    res.status(200).json({ ok: true, deletedUser: result.rows[0] });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
