// import { pgPool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const { dish_name, is_veg, mess_id } = req.body;

//     await pgPool.query(
//       "INSERT INTO special_dishes (dish_name, is_veg, mess_id) VALUES ($1, $2, $3)",
//       [dish_name, is_veg, mess_id]
//     );

//     res.status(200).json({ message: "Dish added successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to add special dish" });
//   }
// }
// pages/api/menu/special/add.js
import { pgPool } from "../../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // -----------------------------------------------------
  // 🔐 JWT REQUIRED
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
  // ➕ ADD SPECIAL DISH
  // -----------------------------------------------------
  try {
    const { dish_name, is_veg, image_url } = req.body;

    if (!dish_name || typeof is_veg === "undefined") {
      return res.status(400).json({ error: "dish_name and is_veg required" });
    }

    await pgPool.query(
      `
      INSERT INTO special_dishes (dish_name, is_veg, image_url,mess_id)
      VALUES ($1, $2, $3, $4)
    `,
      [dish_name, is_veg, image_url || null, messId] // ✅ mess_id strictly from token
    );

    return res.status(200).json({ message: "Dish added successfully" });
  } catch (err) {
    console.error("❌ Error adding dish:", err);
    return res.status(500).json({ error: "Failed to add special dish" });
  }
}
