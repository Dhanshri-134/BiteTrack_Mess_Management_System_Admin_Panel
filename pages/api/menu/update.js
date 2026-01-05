import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // 🔐 TOKEN REQUIRED
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: "Authorization token required" });

    const token = authHeader.split(" ")[1];
    if (!token)
      return res.status(401).json({ error: "Invalid token format" });

    // 🔓 DECODE JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const mess_id = decoded.messId;
    if (!mess_id)
      return res.status(403).json({ error: "Invalid token: messId missing" });

    const { menuData } = req.body;

    if (!menuData)
      return res.status(400).json({ error: "menuData is required" });

    // 🔁 LOOP THROUGH MENU
    for (const day of Object.keys(menuData)) {
      const meals = menuData[day];

      for (const mealType of ["Breakfast", "Lunch", "Dinner"]) {
        const items = meals[mealType] || [];

        await pgPool.query(
          `
          INSERT INTO menu (mess_id, day_of_week, meal_type, items, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (mess_id, day_of_week, meal_type)
          DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()
        `,
          [mess_id, day, mealType, items]
        );

        await pgPool.query(
          `
          INSERT INTO monthly_menu_history (mess_id, day_of_week, meal_type, items, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `,
          [mess_id, day, mealType, items]
        );
      }
    }

    // 🧹 CLEANUP
    await pgPool.query(`
      DELETE FROM monthly_menu_history
      WHERE created_at < NOW() - INTERVAL '7 days'
    `);

    res.status(200).json({ message: "Menu updated successfully" });
  } catch (err) {
    console.error("❌ Menu update error:", err);
    res.status(500).json({ error: "Failed to update menu" });
  }
}




// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const { menuData, mess_id } = req.body;

//     for (const day of Object.keys(menuData)) {
//       const meals = menuData[day];

//       for (const mealType of ["Breakfast", "Lunch", "Dinner"]) {
//         const items = meals[mealType] || [];

//         // UPSERT menu table
//         const upsertQuery = `
//           INSERT INTO menu (mess_id, day_of_week, meal_type, items, created_at, updated_at)
//           VALUES ($1, $2, $3, $4, NOW(), NOW())
//           ON CONFLICT (mess_id, day_of_week, meal_type)
//           DO UPDATE SET items = $4, updated_at = NOW()
//         `;
//         await pgPool.query(upsertQuery, [mess_id, day, mealType, items]);

//         // Insert into monthly_menu_history
//         const historyQuery = `
//           INSERT INTO monthly_menu_history (mess_id, day_of_week, meal_type, items, created_at)
//           VALUES ($1, $2, $3, $4, NOW())
//         `;
//         await pgPool.query(historyQuery, [mess_id, day, mealType, items]);
//       }
//     }

//     res.status(200).json({ message: "Menu updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to update menu" });
//   }
// }
