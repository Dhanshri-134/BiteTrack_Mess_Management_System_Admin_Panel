// import { pgPool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   try {
//     const query = `
//       SELECT dish_name, is_veg, votes
//       FROM special_dishes
//       ORDER BY votes DESC
//     `;
//     const { rows } = await pgPool.query(query);

//     const totalVotes = rows.reduce((sum, d) => sum + d.votes, 0);
//     const specials = rows.map(d => ({
//       dish_name: d.dish_name,
//       is_veg: d.is_veg,
//       percentage: totalVotes ? Math.round((d.votes / totalVotes) * 100) : 0
//     }));

//     res.status(200).json({ specials });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch specials" });
//   }
// }





// pages/api/menu/special/fetch.js
import { pgPool } from "../../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // -------------------------
  // 🔐 Require JWT
  // -------------------------
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

  // -------------------------
  // 📌 Fetch special dishes for this mess only
  // -------------------------
  try {
    const query = `
      SELECT dish_name, is_veg, votes
      FROM special_dishes
      WHERE mess_id = $1
      ORDER BY votes DESC
    `;

    const { rows } = await pgPool.query(query, [messId]);

    const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);

    const specials = rows.map((r) => ({
      dish_name: r.dish_name,
      is_veg: r.is_veg,
      votes: r.votes,
      percentage: totalVotes ? Math.round((r.votes / totalVotes) * 100) : 0,
    }));

    return res.status(200).json({ specials });

  } catch (err) {
    console.error("❌ Error fetching specials:", err);
    return res.status(500).json({ error: "Failed to fetch specials" });
  }
}
