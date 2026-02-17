





// pages/api/bills/fetch.js
import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const monthParam = req.query.month;

// convert "11" or "November" → 11
const numericMonth = isNaN(monthParam)
  ? new Date(`${monthParam} 1, 2000`).getMonth() + 1
  : Number(monthParam);


  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Please login again." });
    }

    function toISTDate(dateVal) {
  if (!dateVal) return null;

  // dateVal can be Date or string
  const d = new Date(dateVal);

  return d.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}


    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;
    if (!messId) return res.status(401).json({ error: "Invalid token. messId missing." });

    // Require filters
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required filters" });
    }

    // Fetch users in this mess
    const usersQuery = `
      SELECT 
  u.id,
  u.name,
  u.email,
  u.status,
  u.phone,
  p.contact AS parent_mobile,
  m.per_day_rate
FROM users u
JOIN messes m ON u.mess_id = m.id
LEFT JOIN parents p 
  ON p.user_id = u.id 
  AND p.mess_id = u.mess_id
WHERE u.mess_id = $1
ORDER BY u.name


    `;
    const { rows: users } = await pgPool.query(usersQuery, [messId]);

    // Fetch monthly_attendance for the selected month/year
    const attendanceQuery = `
      SELECT
  user_id,
  year,
  month,
  days_billed,
  present_days,
  allowed_leave_days,
  attendance_map
FROM monthly_attendance_billing
WHERE mess_id = $1
  AND month = $2
  AND year = $3

    `;
    const { rows: attendanceRows } = await pgPool.query(attendanceQuery, [messId, Number(month), Number(year)]);
    const attendanceMap = {};
    attendanceRows.forEach(a => {
      attendanceMap[a.user_id] = a;
    });

    // Fetch payment_history for the selected month/year
    const paymentsQuery = `
  SELECT user_id, payment_date, amount, status, note
  FROM payment_history
  WHERE mess_id = $1
    AND (
      CASE
        -- If the text is numeric (e.g., "2", "02")
        WHEN month ~ '^[0-9]+$' THEN CAST(month AS INTEGER)

        -- If the text is a month name (e.g., "February", "Feb")
        ELSE EXTRACT(MONTH FROM TO_DATE(month, 'Month'))
      END
    ) = $2
    AND year = $3
`;

    const { rows: paymentRows } = await pgPool.query(paymentsQuery, [messId, numericMonth, Number(year)]);
    const paymentMap = {};
paymentRows.forEach(p => {
  paymentMap[`${p.user_id}-${year}-${Number(month)}`] = p;
});



 const bills = [];

for (const a of attendanceRows) {
  const u = users.find(x => x.id === a.user_id);
  if (!u) continue;

  const paymentKey = `${a.user_id}-${a.year}-${a.month}`;
  const payment = paymentMap[paymentKey];

  const perDay = Number(u.per_day_rate ?? 0);
  const totalAmount = Number((a.days_billed * perDay).toFixed(2));

  const start = new Date(a.year, a.month - 1, 1);
  const end = new Date(a.year, a.month, 0);

    bills.push({
    user_id: u.id,
    name: u.name,
    email: u.email,
    status: u.status ?? "Active",
 mobile: u.phone,
parent_mobile: u.parent_mobile,

    year: a.year,
    month: a.month,

    start_date: toISTDate(start),
    end_date: toISTDate(end),

    days_billed: a.days_billed,
    chosen_per_day_rate: perDay,
    total_amount: totalAmount,

    paid: payment?.status === "paid",
    note: payment?.note || null,
    attendance_map: a.attendance_map ?? null,
  });
}


    return res.status(200).json(bills);

  } catch (err) {
    console.error("🔥 Error in /api/bills/fetch:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
