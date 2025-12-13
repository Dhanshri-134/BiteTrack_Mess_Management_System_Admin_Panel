// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "GET")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     // Assuming `users` table has a column `food_preference` ('veg' or 'nonveg')
//     const { rows } = await pgPool.query(`
//       SELECT food_preference, COUNT(*) AS count
//       FROM users
//       WHERE food_preference IN ('veg', 'nonveg')
//       GROUP BY food_preference
//     `);

//     const data = {
//       veg: 0,
//       nonveg: 0,
//     };

//     rows.forEach((r) => {
//       if (r.food_preference === "veg") data.veg = Number(r.count);
//       if (r.food_preference === "nonveg") data.nonveg = Number(r.count);
//     });

//     res.status(200).json(data);
//   } catch (err) {
//     console.error("Error fetching food type stats:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// }
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  // ---------------------------------------------------
  // 🔐 Require JWT token
  // ---------------------------------------------------
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

  // ---------------------------------------------------
  // 📊 Fetch food preference counts ONLY for this mess
  // ---------------------------------------------------
  try {
    const { rows } = await pgPool.query(
      `
      SELECT food_preference, COUNT(*) AS count
      FROM users
      WHERE food_preference IN ('veg', 'nonveg')
        AND mess_id = $1
      GROUP BY food_preference
      `,
      [messId]
    );

    const data = { veg: 0, nonveg: 0 };
    rows.forEach((r) => {
      if (r.food_preference === "veg") data.veg = Number(r.count);
      if (r.food_preference === "nonveg") data.nonveg = Number(r.count);
    });

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching food type stats:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
