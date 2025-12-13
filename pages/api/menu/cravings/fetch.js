// //pages\api\menu\cravings\fetch.js

// import { pgPool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   try {
//     const { rows } = await pgPool.query(`
//       SELECT user_id, mess_id, craving_text, status, created_at
//       FROM user_cravings
//       ORDER BY created_at DESC
//     `);
//     res.status(200).json(rows);
//   } catch (err) {
//     console.error("Error fetching cravings:", err);
//     res.status(500).json({ error: "Failed to fetch cravings" });
//   }
// }



import jwt from "jsonwebtoken";
import { pgPool } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ====================================================
    // 🔐 REQUIRE VALID TOKEN ALWAYS
    // ====================================================
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    if (!decoded?.messId) {
      return res.status(401).json({ ok: false, message: "Invalid token (messId missing)" });
    }

    const messId = decoded.messId;

    // ====================================================
    // ✔ FETCH cravings for THIS MESS ONLY
    // ====================================================
    const query = `
      SELECT user_id, mess_id, craving_text, status, created_at
      FROM user_cravings
      WHERE mess_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await pgPool.query(query, [messId]);

    return res.status(200).json(rows);

  } catch (err) {
    console.error("❌ Error fetching cravings:", err);
    return res.status(500).json({ error: "Failed to fetch cravings" });
  }
}
