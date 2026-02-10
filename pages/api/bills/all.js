import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });


  function toISTDate(dateVal) {
    if (!dateVal) return null;
    return new Date(dateVal).toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  }

  function getMonthRange(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  }

  /* ---------------- AUTH ---------------- */

  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    if (!messId) {
      return res.status(401).json({ error: "Invalid token. messId missing." });
    }

    /* ---------------- USERS ---------------- */

    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.status,
        m.per_day_rate
      FROM users u
      JOIN messes m ON u.mess_id = m.id
      WHERE u.mess_id = $1
      ORDER BY u.name
    `;
    const { rows: users } = await pgPool.query(usersQuery, [messId]);

    /* ---------------- ATTENDANCE (ALL MONTHS) ---------------- */

    const attendanceQuery = `
      SELECT
  user_id,
  year,
  month,
  present_days,
  attendance_map,
  allowed_leave_days,
  days_billed
FROM monthly_attendance_billing
WHERE mess_id = $1

    `;
    const { rows: attendanceRows } = await pgPool.query(attendanceQuery, [
      messId,
    ]);

    /* ---------------- PAYMENTS (ALL MONTHS) ---------------- */

    const paymentsQuery = `
      SELECT 
        user_id,
        payment_date,
        status,
        note,
        CASE
          WHEN month ~ '^[0-9]+$' THEN CAST(month AS INTEGER)
          ELSE EXTRACT(MONTH FROM TO_DATE(month, 'Month'))
        END AS month,
        year
      FROM payment_history
      WHERE mess_id = $1
    `;
    const { rows: paymentRows } = await pgPool.query(paymentsQuery, [messId]);

    const paymentMap = {};
    paymentRows.forEach(p => {
      paymentMap[`${p.user_id}-${p.year}-${p.month}`] = p;
    });

    /* ---------------- BUILD BILLS ---------------- */

    const bills = [];

    for (const a of attendanceRows) {
      const u = users.find(x => x.id === a.user_id);
      if (!u) continue;

      const paymentKey = `${a.user_id}-${a.year}-${a.month}`;
      const payment = paymentMap[paymentKey];


      const daysBilled = a.days_billed;

      const perDay = Number(u.per_day_rate ?? 0);
      const totalAmount = Number((daysBilled * perDay).toFixed(2));

      const { start, end } = getMonthRange(a.year, a.month);

      bills.push({
        user_id: u.id,
        name: u.name,
        email: u.email,
        status: u.status ?? "Active",

        year: a.year,
        month: a.month,

        start_date: toISTDate(start),
        end_date: toISTDate(end),

        days_billed: daysBilled,
        chosen_per_day_rate: perDay,
        total_amount: totalAmount,

        paid: payment?.status === "paid",
        note: payment?.note || null,
        attendance_map: a.attendance_map ?? null,
      });
    }


    return res.status(200).json(bills);

  } catch (err) {
    console.error("🔥 Error in /api/bills/all:", err);
    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
}


















// import jwt from "jsonwebtoken";
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }

//   if (req.method !== "GET") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   function countAllowedLeaveDays(attendanceMapObj) {
//     if (!attendanceMapObj) return 0;

//     const entries = Object.entries(attendanceMapObj)
//       .map(([date, val]) => ({ date, val }))
//       .sort((a, b) => new Date(a.date) - new Date(b.date));

//     let allowed = 0;
//     let streak = 0;

//     for (const e of entries) {
//       if (e.val === false) {
//         streak++;
//       } else {
//         if (streak >= 2) allowed += streak;
//         streak = 0;
//       }
//     }

//     if (streak >= 2) allowed += streak;
//     return allowed;
//   }

//   function toISTDate(dateVal) {
//     if (!dateVal) return null;
//     return new Date(dateVal).toLocaleDateString("en-CA", {
//       timeZone: "Asia/Kolkata",
//     });
//   }

//   try {
//     // 🔐 Auth
//     const auth = req.headers.authorization;
//     if (!auth || !auth.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const messId = decoded.messId;

//     if (!messId) {
//       return res.status(401).json({ error: "Invalid token. messId missing." });
//     }

//     // 👥 Users
//     const usersQuery = `
//       SELECT 
//         u.id,
//         u.name,
//         u.email,
//         u.status,
//         m.per_day_rate
//       FROM users u
//       JOIN messes m ON u.mess_id = m.id
//       WHERE u.mess_id = $1
//       ORDER BY u.name
//     `;
//     const { rows: users } = await pgPool.query(usersQuery, [messId]);

//     // 📅 Monthly attendance (ALL months)
//     const attendanceQuery = `
//       SELECT user_id, year, month, days_present, attendance_map, first_attendance_date
//       FROM monthly_attendance
//       WHERE mess_id = $1
//     `;
//     const { rows: attendanceRows } = await pgPool.query(attendanceQuery, [messId]);

//     const attendanceMap = {};
//     attendanceRows.forEach(a => {
//       attendanceMap[`${a.user_id}-${a.year}-${a.month}`] = a;
//     });

//     // 💰 Payment history (ALL months)
//     const paymentsQuery = `
//       SELECT user_id, payment_date, status, note,
//         CASE
//           WHEN month ~ '^[0-9]+$' THEN CAST(month AS INTEGER)
//           ELSE EXTRACT(MONTH FROM TO_DATE(month, 'Month'))
//         END AS month,
//         year
//       FROM payment_history
//       WHERE mess_id = $1
//     `;
//     const { rows: paymentRows } = await pgPool.query(paymentsQuery, [messId]);

//     const paymentMap = {};
//     paymentRows.forEach(p => {
//       paymentMap[`${p.user_id}-${p.year}-${p.month}`] = p;
//     });

//     // 🧮 Build bills
//     const bills = [];

//     for (const a of attendanceRows) {
//       const u = users.find(x => x.id === a.user_id);
//       if (!u) continue;

//       const key = `${a.user_id}-${a.year}-${a.month}`;
//       const payment = paymentMap[key];

//       const startDate = a.first_attendance_date
//         ? new Date(a.first_attendance_date)
//         : null;

//       if (!startDate) continue; // 🔥 do NOT fake today()

//       const endDate = payment?.payment_date
//         ? new Date(payment.payment_date)
//         : new Date();

//       const totalDays =
//         Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

//       const allowedLeave = countAllowedLeaveDays(a.attendance_map);
//       const days = Math.max(totalDays - allowedLeave, 0);

//       const perDay = Number(u.per_day_rate ?? 0);
//       const total = Number((days * perDay).toFixed(2));

//       bills.push({
//         user_id: u.id,
//         name: u.name,
//         email: u.email,
//         status: u.status ?? "Active",
//         year: a.year,
//         month: a.month,
//         start_date: toISTDate(startDate),
//         end_date: toISTDate(endDate),
//         days_billed: days,
//         chosen_per_day_rate: perDay,
//         total_amount: total,
//         paid: payment?.status === "paid",
//         note: payment?.note || null,
//         attendance_map: a.attendance_map ?? null,
//       });
//     }

//     return res.status(200).json(bills);

//   } catch (err) {
//     console.error("🔥 Error in /api/bills/all:", err);
//     return res.status(500).json({ error: err.message || "Internal server error" });
//   }
// }







