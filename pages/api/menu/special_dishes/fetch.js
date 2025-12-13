// import { pgPool } from "../../../../lib/db";

// export default async function handler(req, res) {
//   try {
//     const { mess_id } = req.query;

//     const { rows } = await pgPool.query(
//       "SELECT * FROM special_dishes WHERE mess_id = $1 ORDER BY votes DESC",
//       [mess_id]
//     );

//     res.status(200).json(rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch special dishes" });
//   }
// }




import { pgPool } from "../../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const mess_id = decoded.messId; // ✅ strictly from JWT

    const { rows } = await pgPool.query(
      "SELECT * FROM special_dishes WHERE mess_id = $1 ORDER BY votes DESC",
      [mess_id]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch special dishes" });
  }
}




