
// pages/api/users/verified.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // -------------------------------------------------------------
  // 🔐 REQUIRE TOKEN + VERIFY USING JWT ONLY
  // -------------------------------------------------------------
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = auth.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.warn("Invalid token:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  // -------------------------------------------------------------
  // 📌 Fetch Verified Users ONLY FROM THIS mess_id
  // -------------------------------------------------------------
  try {
    const query = `
      SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.name,
  u.email,
  u.phone,
  u.room_no,
  u.hostel_name,
  u.course,
  u.date_of_joining,
  u.verified,
  u.created_at,
  u.status,

  ma.first_attendance_date,

  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'name', p.name,
        'contact', p.contact,
        'address', p.address
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'
  ) AS parents

FROM users u

/* ✅ attendance reduced to ONE row per user */
LEFT JOIN (
  SELECT 
    user_id,
    MIN(first_attendance_date) AS first_attendance_date
  FROM monthly_attendance
  GROUP BY user_id
) ma ON ma.user_id = u.id

LEFT JOIN parents p ON p.user_id = u.id

WHERE u.verified = true
  AND u.mess_id = $1
  AND u.status ='Active'

GROUP BY 
  u.id,
  ma.first_attendance_date

ORDER BY u.created_at DESC;

    `;

    const { rows } = await pgPool.query(query, [messId]);

    res.status(200).json(rows || []);
  } catch (err) {
    console.error("❌ Error fetching verified users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
