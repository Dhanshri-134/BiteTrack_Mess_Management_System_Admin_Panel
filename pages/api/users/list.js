// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const result = await pgPool.query(`
//       SET TIME ZONE 'Asia/Kolkata';
//   SELECT u.id, u.first_name, u.last_name, u.name, u.email, u.phone, 
//          u.mobile, u.room_no, u.hostel_name, u.course, u.date_of_joining,
//          u.verified, u.created_at
//   FROM users u
//   ORDER BY u.created_at DESC
// `);
// console.log(result.rows);

   
//     res.status(200).json(result.rows || []);
//   } catch (err) {
//     console.error("Error fetching users:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }




import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  // -----------------------------
  // 🔐 Require JWT token
  // -----------------------------
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
  if (!messId) return res.status(400).json({ error: "messId missing in token" });

  try {
    // Set time zone for the session
    await pgPool.query(`SET TIME ZONE 'Asia/Kolkata';`);

    // Fetch users for this mess only
    const { rows } = await pgPool.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.name, u.email, u.phone,
              u.room_no, u.hostel_name, u.course, u.date_of_joining,
             u.verified, u.created_at
      FROM users u
      WHERE u.mess_id = $1 AND u.verified = true AND u.status='Active'
      ORDER BY u.created_at DESC
      `,
      [messId]
    );

    res.status(200).json(rows || []);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
