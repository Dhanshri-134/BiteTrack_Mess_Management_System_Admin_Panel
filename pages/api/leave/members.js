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

  try {
    // 🔐 Verify token
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const mess_id = decoded.messId;
    if (!mess_id) {
      return res.status(400).json({ error: "mess_id missing in token" });
    }

    // ───────────────────────────────────────────────
    // 1️⃣ APPROVED LEAVE MEMBERS (leave_requests)
    // ───────────────────────────────────────────────
    const approvedQuery = `
      SELECT lr.*,
             u.name AS user_name,
             u.email AS user_email,
             u.phone
      FROM leave_requests lr
      LEFT JOIN users u ON u.id = lr.user_id
      WHERE lr.mess_id = $1
        AND lr.status = 'Approved'
        AND CURRENT_DATE BETWEEN lr.from_date AND lr.to_date
      ORDER BY lr.from_date;
    `;

    const approvedMembers = (await pgPool.query(approvedQuery, [mess_id])).rows;

    // ───────────────────────────────────────────────
    // 2️⃣ EXCESS ABSENT MEMBERS (monthly_attendance)
    // ───────────────────────────────────────────────

    // 2.1 allowed_leave_days
    const messSettings = await pgPool.query(
      `SELECT allowed_leave_days FROM messes WHERE id=$1`,
      [mess_id]
    );

    const allowed_leave_days = messSettings.rows[0]?.allowed_leave_days ?? 0;

    // 2.2 year + month
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // 2.3 attendance_map-based query (gives absent date list)
//     const absentQuery = `
//       WITH calc AS (
//         SELECT
//           ma.user_id,
//           u.name AS user_name,
//           u.email AS user_email,
//           u.phone AS phone ,
//           ma.attendance_map,
//           (
//             SELECT jsonb_agg(key)
//             FROM jsonb_each_text(ma.attendance_map)
//             WHERE value = 'false'
//           ) AS absent_dates,
//           (
//             SELECT COUNT(*)
//             FROM jsonb_each_text(ma.attendance_map)
//             WHERE value = 'false'
//           ) AS absent_count
//         FROM monthly_attendance ma
//         JOIN users u ON u.id = ma.user_id
//         WHERE ma.mess_id = $1 AND ma.year = $2 AND ma.month = $3
//       )
//       SELECT
//         user_id,
//         user_name,
//         user_email,
//         phone,
//         absent_dates,
//         absent_count
//       FROM calc
//       WHERE absent_count > $4;
//     `;

//     const absentRows = (
//       await pgPool.query(absentQuery, [
//         mess_id,
//         year,
//         month,
//         allowed_leave_days
//       ])
//     ).rows;

//     // convert absent_dates array → start_date + end_date
//     const excessAbsent = absentRows.map((u) => {
//   const sorted = u.absent_dates
//     ?.map((d) => new Date(d))
//     .sort((a, b) => a - b);

//   return {
//     ...u,
//     contact_no: u.phone,  // 🔥 sync field name for UI
//     start_date: sorted?.[0] ?? null,
//     end_date: sorted?.[sorted.length - 1] ?? null,
//   };
// });

// 2.3 attendance_map-based query (dynamic absent dates)
const absentQuery = `
WITH month_days AS (
    SELECT generate_series(
        date_trunc('month', make_date($2, $3, 1))::date,
        (date_trunc('month', make_date($2, $3, 1)) + interval '1 month - 1 day')::date,
        interval '1 day'
    )::text AS day
),
present_days AS (
    SELECT
        ma.user_id,
        jsonb_object_keys(ma.attendance_map) AS day
    FROM monthly_attendance ma
    WHERE ma.mess_id = $1
      AND ma.year = $2
      AND ma.month = $3
),
users AS (
    SELECT DISTINCT ma.user_id, u.name AS user_name, u.email AS user_email, u.phone
    FROM monthly_attendance ma
    JOIN users u ON u.id = ma.user_id
    WHERE ma.mess_id = $1 AND ma.year = $2 AND ma.month = $3
)
SELECT
    u.user_id,
    u.user_name,
    u.user_email,
    u.phone,
    jsonb_agg(md.day) AS absent_dates,
    COUNT(*) AS absent_count
FROM users u
CROSS JOIN month_days md
WHERE md.day NOT IN (
    SELECT day FROM present_days pd WHERE pd.user_id = u.user_id
)
GROUP BY u.user_id, u.user_name, u.user_email, u.phone
HAVING COUNT(*) > $4;
`;

// const absentRows = (
//   await pgPool.query(absentQuery, [mess_id, year, month, allowed_leave_days])
// ).rows;

// convert absent_dates array → start_date + end_date
// const excessAbsent = absentRows.map((u) => {
//   const sorted = u.absent_dates
//     ?.map((d) => new Date(d))
//     .sort((a, b) => a - b);

//   return {
//     ...u,
//     contact_no: u.phone,
//     start_date: sorted?.[0] ?? null,
//     end_date: sorted?.[sorted.length - 1] ?? null,
//   };
// });


    // ───────────────────────────────────────────────
    // RESPONSE
    // ───────────────────────────────────────────────
    res.status(200).json({
      approved_members: approvedMembers,
      // excess_absent_members: excessAbsent
    });

  } catch (err) {
    console.error("❌ Error fetching leave members:", err);
    res.status(500).json({ error: "Failed to fetch leave members" });
  }
}
