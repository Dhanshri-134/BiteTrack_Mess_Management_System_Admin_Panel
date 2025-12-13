// import { pgPool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   try {
//     const query = `
//       SELECT id, user_id, user_name, user_email, rating_type, rating, comment, created_at
//       FROM ratings
//       ORDER BY created_at DESC
//     `;
//     const { rows } = await pgPool.query(query);
//     console.log("Fetched ratings & reviews:", rows);
//     res.status(200).json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch ratings & reviews" });
//   }
// }






// pages/api/menu/ratings/fetch.js
import { pgPool } from "../../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // -----------------------------------------------------
  // 🔐 STRICT TOKEN REQUIRED
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // 📌 Fetch ratings for THIS mess only
  // -----------------------------------------------------
  try {
    const query = `
      SELECT 
        id,
        user_id,
        user_name,
        user_email,
        rating_type,
        rating,
        comment,
        created_at
      FROM ratings
      WHERE mess_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await pgPool.query(query, [messId]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching ratings:", err);
    return res.status(500).json({ error: "Failed to fetch ratings & reviews" });
  }
}
