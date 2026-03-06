import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  try {

  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:"Unauthorized"});

  const token = auth.split(" ")[1];
  const decoded = jwt.verify(token,process.env.JWT_SECRET);

  const messId = decoded.messId;

  const {rows} = await pgPool.query(
    `SELECT *
     FROM billing_view
     WHERE mess_id=$1
     ORDER BY year DESC,month DESC`,
    [messId]
  );

  res.json(rows);

    // const { rows } = await pgPool.query(query, [messId]);

    // const bills = rows.map(r => ({
    //   user_id: r.user_id,
    //   name: r.name,
    //   email: r.email,
    //   status: r.status ?? "Active",
    //   mobile: r.mobile,
    //   parent_mobile: r.parent_mobile,

    //   year: r.year,
    //   month: r.month,

    //   days_billed: r.days_billed,
    //   chosen_per_day_rate: Number(r.chosen_per_day_rate),

    //   total_amount: Number(r.total_amount),

    //   paid: r.payment_status === "paid",
    //   note: r.note || null,

    //   attendance_map: r.attendance_map ?? {},
    //   owner_marked_dates: r.owner_marked_dates ?? []
    // }));

    // return res.json(bills);

  } catch (err) {
    console.error("Billing API error:", err);
    return res.status(500).json({ error: err.message });
  }
}































// import jwt from "jsonwebtoken";
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

//   if (req.method === "OPTIONS") return res.status(200).end();
//   if (req.method !== "GET")
//     return res.status(405).json({ error: "Method not allowed" });


//   function toISTDate(dateVal) {
//     if (!dateVal) return null;
//     return new Date(dateVal).toLocaleDateString("en-CA", {
//       timeZone: "Asia/Kolkata",
//     });
//   }

//   function getMonthRange(year, month) {
//     const start = new Date(year, month - 1, 1);
//     const end = new Date(year, month, 0);
//     return { start, end };
//   }

//   /* ---------------- AUTH ---------------- */

//   try {
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

//     /* ---------------- USERS ---------------- */

//     const usersQuery = `
//       SELECT 
//   u.id,
//   u.name,
//   u.email,
//   u.status,
//   u.phone,
//   p.contact AS parent_mobile,
//   m.per_day_rate
// FROM users u
// JOIN messes m ON u.mess_id = m.id
// LEFT JOIN parents p 
//   ON p.user_id = u.id 
//   AND p.mess_id = u.mess_id
// WHERE u.mess_id = $1
// ORDER BY u.name

//     `;
//     const { rows: users } = await pgPool.query(usersQuery, [messId]);

//     /* ---------------- ATTENDANCE (ALL MONTHS) ---------------- */

//     const attendanceQuery = `
//       SELECT
//   user_id,
//   year,
//   month,
//   present_days,
//   attendance_map,
//   allowed_leave_days,
//   days_billed
// FROM monthly_attendance_billing
// WHERE mess_id = $1
// ORDER BY year DESC, month DESC

//     `;
//     const { rows: attendanceRows } = await pgPool.query(attendanceQuery, [
//       messId,
//     ]);

//     /* ---------------- PAYMENTS (ALL MONTHS) ---------------- */

//     const paymentsQuery = `
//       SELECT 
//         user_id,
//         payment_date,
//         status,
//         note,
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

//     const ownerQuery = `
//   SELECT user_id, att_date
//   FROM "Owner_Marked_attendance"
//   WHERE mess_id = $1
// `;

// const { rows: ownerRows } = await pgPool.query(ownerQuery, [
//   messId
// ]);

// const ownerMap = {};

// ownerRows.forEach(o => {
//   const dateStr = new Date(o.att_date)
//     .toISOString()
//     .slice(0, 10);

//   if (!ownerMap[o.user_id]) {
//     ownerMap[o.user_id] = [];
//   }

//   ownerMap[o.user_id].push(dateStr);
// });

//     /* ---------------- BUILD BILLS ---------------- */

//     const bills = [];

//     for (const a of attendanceRows) {
//       const u = users.find(x => x.id === a.user_id);
//       if (!u) continue;

//       const paymentKey = `${a.user_id}-${a.year}-${a.month}`;
//       const payment = paymentMap[paymentKey];


//       const daysBilled = a.days_billed;

//       const perDay = Number(u.per_day_rate ?? 0);
//       const totalAmount = Number((daysBilled * perDay).toFixed(2));

//       const { start, end } = getMonthRange(a.year, a.month);

//       bills.push({
//         user_id: u.id,
//         name: u.name,
//         email: u.email,
//         status: u.status ?? "Active",
// mobile: u.phone,
// parent_mobile: u.parent_mobile,

//         year: a.year,
//         month: a.month,

//         start_date: toISTDate(start),
//         end_date: toISTDate(end),

//         days_billed: daysBilled,
//         chosen_per_day_rate: perDay,
//         total_amount: totalAmount,

//         paid: payment?.status === "paid",
//         note: payment?.note || null,
//         attendance_map: a.attendance_map ?? {},
// owner_marked_dates: ownerMap[a.user_id] ?? [],
//       });
//     }

//     return res.status(200).json(bills);

//   } catch (err) {
//     console.error("🔥 Error in /api/bills/all:", err);
//     return res.status(500).json({
//       error: err.message || "Internal server error",
//     });
//   }
// }








