// import { pgPool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "DELETE") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { id } = req.body;

//     if (!id) return res.status(400).json({ error: "Dish ID is required" });

//     await pgPool.query(`DELETE FROM special_dishes WHERE id = $1`, [id]);

//     res.status(200).json({ message: "Dish deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting dish:", err);
//     res.status(500).json({ error: "Failed to delete dish" });
//   }
// }



// import { pgPool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "DELETE") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     // Accept id from body OR query to avoid empty-body issues
//     const id = req.body?.id || req.query?.id;

//     if (!id) {
//       return res.status(400).json({ error: "Dish ID is required" });
//     }

//     await pgPool.query(`DELETE FROM special_dishes WHERE id = $1`, [id]);

//     return res
//       .status(200)
//       .json({ message: "Dish deleted successfully" });
      
//   } catch (err) {
//     console.error("Error deleting dish:", err);
//     return res.status(500).json({ error: "Failed to delete dish" });
//   }
// }




// pages/api/menu/special/delete.js
import { pgPool } from "../../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
  // 🗑 DELETE DISH OWNED BY THIS MESS ONLY
  // -----------------------------------------------------
  try {
    const id = req.body?.id || req.query?.id;

    if (!id) {
      return res.status(400).json({ error: "Dish ID is required" });
    }

    const result = await pgPool.query(
      `
      DELETE FROM special_dishes
      WHERE id = $1 AND mess_id = $2
      RETURNING id;
      `,
      [id, messId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Dish not found or not authorized" });
    }

    return res
      .status(200)
      .json({ message: "Dish deleted successfully" });

  } catch (err) {
    console.error("❌ Error deleting dish:", err);
    return res.status(500).json({ error: "Failed to delete dish" });
  }
}
