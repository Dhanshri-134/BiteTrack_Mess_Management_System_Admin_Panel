
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   try {
//     const query = `
//       SELECT id, mess_id, day_of_week, meal_type, items
//       FROM menu
//       ORDER BY day_of_week, meal_type
//     `;

//     const { rows } = await pgPool.query(query);

//     // Format data to { Monday: { Breakfast: [], ... }, ... } if needed in frontend
//     const formatted = {};
//     rows.forEach((row) => {
//       if (!formatted[row.day_of_week]) {
//         formatted[row.day_of_week] = { Breakfast: [], Lunch: [], Dinner: [] };
//       }
//       formatted[row.day_of_week][row.meal_type] = row.items;
//     });

//     res.status(200).json(formatted);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch menu" });
//   }
// }




// pages/api/menu/fetch.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ---------------------------
  // 🔐 REQUIRE JWT
  // ---------------------------
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

  // ---------------------------
  // 📌 FETCH MENU FOR THIS MESS ONLY
  // ---------------------------
  try {
    const query = `
      SELECT id, mess_id, day_of_week, meal_type, items
      FROM menu
      WHERE mess_id = $1
      ORDER BY day_of_week, meal_type
    `;

    const { rows } = await pgPool.query(query, [messId]);

    // Format to: { Monday: { Breakfast: [], Lunch: [], Dinner: [] }, ... }
    const formatted = {};

    rows.forEach((row) => {
      if (!formatted[row.day_of_week]) {
        formatted[row.day_of_week] = {
          Breakfast: [],
          Lunch: [],
          Dinner: []
        };
      }
      formatted[row.day_of_week][row.meal_type] = row.items;
    });

    return res.status(200).json(formatted);

  } catch (err) {
    console.error("❌ Error fetching menu:", err);
    return res.status(500).json({ error: "Failed to fetch menu" });
  }
}
