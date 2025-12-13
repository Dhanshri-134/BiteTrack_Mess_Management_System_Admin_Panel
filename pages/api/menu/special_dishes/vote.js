// import { pool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const { user_id, mess_id, dish_id } = req.body;

//     // check if user already voted
//     const existing = await pool.query(
//       "SELECT * FROM user_votes WHERE user_id = $1 AND mess_id = $2",
//       [user_id, mess_id]
//     );

//     if (existing.rows.length > 0) {
//       return res.status(400).json({ message: "You have already voted" });
//     }

//     // insert vote
//     await pool.query(
//       "INSERT INTO user_votes (user_id, mess_id, dish_id) VALUES ($1, $2, $3)",
//       [user_id, mess_id, dish_id]
//     );

//     // increment vote count
//     await pool.query("UPDATE special_dishes SET votes = votes + 1 WHERE id = $1", [dish_id]);

//     res.status(200).json({ message: "Vote submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting vote:", error);
//     res.status(500).json({ error: "Failed to submit vote" });
//   }
// }






// pages/api/menu/special/vote.js
import { pgPool } from "../../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // -----------------------------------------------------
  // 🔐 REQUIRE JWT
  // -----------------------------------------------------
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
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

  // -----------------------------------------------------
  // 🗳 PROCESS VOTE
  // -----------------------------------------------------
  try {
    const { user_id, dish_id } = req.body;

    if (!user_id || !dish_id) {
      return res.status(400).json({ error: "user_id and dish_id are required" });
    }

    // Check if dish belongs to this mess
    const dishCheck = await pgPool.query(
      `SELECT id FROM special_dishes WHERE id = $1 AND mess_id = $2`,
      [dish_id, messId]
    );

    if (dishCheck.rowCount === 0) {
      return res.status(404).json({ error: "Dish not found for your mess" });
    }

    // Check if user already voted
    const existing = await pgPool.query(
      `SELECT id FROM user_votes WHERE user_id = $1 AND mess_id = $2`,
      [user_id, messId]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({ message: "You have already voted" });
    }

    // Insert vote
    await pgPool.query(
      `INSERT INTO user_votes (user_id, mess_id, dish_id)
       VALUES ($1, $2, $3)`,
      [user_id, messId, dish_id]
    );

    // Increment vote count
    await pgPool.query(
      `UPDATE special_dishes SET votes = votes + 1 WHERE id = $1 AND mess_id = $2`,
      [dish_id, messId]
    );

    return res.status(200).json({ message: "Vote submitted successfully" });

  } catch (error) {
    console.error("❌ Error submitting vote:", error);
    return res.status(500).json({ error: "Failed to submit vote" });
  }
}
