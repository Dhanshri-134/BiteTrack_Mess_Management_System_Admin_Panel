// // pages/api/users/unmailed.js
// import { pgPool } from '../../../lib/db';

// export default async function handler(req, res) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const client = await pgPool.connect();
//   try {
//     const result = await client.query(
//       `SELECT id, name, first_name, last_name, email, phone,  room_no, hostel_name, course, date_of_joining
//        FROM users
//        WHERE verified = false AND mail_sent = false
//        ORDER BY name ASC`
//     );

//     res.status(200).json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error', details: err.message });
//   } finally {
//     client.release();
//   }
// }
// pages/api/users/unmailed.js
import { pgPool } from '../../../lib/db';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ------------------------
  // 🔐 Verify JWT token
  // ------------------------
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
  if (!messId) return res.status(400).json({ error: "messId missing in token" });

  // ------------------------
  // Fetch unmailed users for this mess_id
  // ------------------------
  try {
    const result = await pgPool.query(
      `
      SELECT id, name, first_name, last_name, email, phone, room_no, hostel_name, course, date_of_joining
      FROM users
      WHERE verified = false AND mail_sent = false AND mess_id = $1
      ORDER BY name ASC
      `,
      [messId]
    );

    res.status(200).json(result.rows || []);
  } catch (err) {
    console.error("Error fetching unmailed users:", err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
