import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1️⃣ Require token
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Please login again." });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2️⃣ Extract messId from JWT
    const messId = decoded.messId;
    if (!messId) {
      return res.status(401).json({ error: "Invalid token. messId missing." });
    }

    // 3️⃣ Query PostgreSQL with STRICT mess_id filter
    const query = `
      SELECT 
        id,
        user_id,
        year,
        month,
        days_billed,
        per_day_rate,
        total_amount,
        paid,
        generated_at
      FROM bills
      WHERE mess_id = $1
      ORDER BY generated_at DESC
    `;

    const { rows } = await pgPool.query(query, [messId]);

    return res.status(200).json(rows);

  } catch (err) {
    console.error("🔥 Error in /api/bills/all:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}



// // pages/api/bills/all.js
// import jwt from "jsonwebtoken";
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const auth = req.headers.authorization;
//     if (!auth || !auth.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Unauthorized. Please login again." });
//     }

//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const messId = decoded.messId;
//     if (!messId) return res.status(401).json({ error: "Invalid token. messId missing." });

//     // Require filters
//     const { month, year } = req.query;
//     if (!month || !year) {
//       return res.status(400).json({ error: "month and year are required filters" });
//     }

//     // Fetch bills joined with users and monthly_attendance
//     const query = `
//       SELECT 
//         b.id,
//         b.user_id,
//         u.name,
//         u.email,
//         u.status,
//         b.year,
//         b.month,
//         ma.days_present,
//         ma.attendance_map,
//         ma.first_attendance_date,
//         b.days_billed,
//         b.per_day_rate,
//         b.total_amount,
//         b.paid,
//         b.generated_at
//       FROM bills b
//       JOIN users u ON u.id = b.user_id
//       LEFT JOIN monthly_attendance ma 
//         ON ma.user_id = b.user_id AND ma.year = b.year AND ma.month = b.month
//       WHERE b.mess_id = $1
//         AND b.month = $2
//         AND b.year = $3
//       ORDER BY b.generated_at DESC
//     `;

//     const { rows } = await pgPool.query(query, [messId, month, year]);
//     return res.status(200).json(rows);

//   } catch (err) {
//     console.error("🔥 Error in /api/bills/all:", err);
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// }
