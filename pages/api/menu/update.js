import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { menuData, mess_id } = req.body;

    if (!mess_id || !menuData)
      return res.status(400).json({ error: "Missing mess_id or menuData" });

    // Loop through all days and meal types
    for (const day of Object.keys(menuData)) {
      const meals = menuData[day];

      for (const mealType of ["Breakfast", "Lunch", "Dinner"]) {
        const items = meals[mealType] || [];

        // ✅ UPSERT main menu table
        const upsertQuery = `
          INSERT INTO menu (mess_id, day_of_week, meal_type, items, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (mess_id, day_of_week, meal_type)
          DO UPDATE SET items = EXCLUDED.items, updated_at = NOW()
        `;
        await pgPool.query(upsertQuery, [mess_id, day, mealType, items]);

        // ✅ Log into history table
        const historyQuery = `
          INSERT INTO monthly_menu_history (mess_id, day_of_week, meal_type, items, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `;
        await pgPool.query(historyQuery, [mess_id, day, mealType, items]);
      }
    }

    // ✅ Delete records older than 7 days from history
    const cleanupQuery = `
      DELETE FROM monthly_menu_history
      WHERE created_at < NOW() - INTERVAL '7 days';
    `;
    await pgPool.query(cleanupQuery);

    res.status(200).json({ message: "Menu updated and history pruned successfully" });
  } catch (err) {
    console.error("❌ Error updating menu:", err);
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
