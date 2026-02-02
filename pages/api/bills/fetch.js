





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

  function countAllowedLeaveDays(attendanceMapObj) {
  if (!attendanceMapObj) return 0;

  const entries = Object.entries(attendanceMapObj)
    .map(([date, val]) => ({ date, val }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // sort by date

  let allowed = 0;
  let streak = 0;

  for (const e of entries) {
    if (e.val === false) {
      streak++;
    } else {
      if (streak >= 2) allowed += streak;  // only count streak >= 2
      streak = 0;
    }
  }

  if (streak >= 2) allowed += streak;

  return allowed;
}

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
    m.per_day_rate
FROM users u
JOIN messes m ON u.mess_id = m.id
WHERE u.mess_id = $1
ORDER BY u.name;

    `;
    const { rows: users } = await pgPool.query(usersQuery, [messId]);

    // Fetch monthly_attendance for the selected month/year
    const attendanceQuery = `
      SELECT user_id, days_present, attendance_map, first_attendance_date
      FROM monthly_attendance
      WHERE mess_id = $1 AND month = $2 AND year = $3
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

    const { rows: paymentRows } = await pgPool.query(paymentsQuery, [messId, month, Number(year)]);
    const paymentMap = {};
    paymentRows.forEach(p => {
      paymentMap[p.user_id] = p;
    });

    // Map all users to bills
  //   const bills = users.map(u => {
  //     const attendance = attendanceMap[u.id];
  //     const payment = paymentMap[u.id];

  //     const start_date = attendance?.first_attendance_date
  // ? toISTDate(attendance.first_attendance_date)
  // : toISTDate(new Date());

  //     const endDate = payment?.payment_date
  //   ? new Date(payment.payment_date)
  //   : new Date();

  // // total days between start and end
  // const totalDays =
  //   Math.floor((endDate - start_date) / (1000 * 60 * 60 * 24)) + 1;

  // // allowed leave = consecutive FALSE streaks only
  // const allowedLeave = countAllowedLeaveDays(attendance?.attendance_map);

  // // final billed days
  // const days = Math.max(totalDays - allowedLeave, 0);
  //     const perDay = Number(u.per_day_rate ?? 0);
  //     const total = Number((days * perDay).toFixed(2));

  //     return {
  //       user_id: u.id,
  //       name: u.name,
  //       email: u.email,
  //       status: u.status ?? "Active",
  //       start_date,
  //       // end_date: payment?.payment_date ? new Date(payment.payment_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  //       end_date: payment?.payment_date 
  // ? toISTDate(payment.payment_date)
  // : toISTDate(new Date()),

  //       days_billed: days,
  //       chosen_per_day_rate: perDay,
  //       total_amount: total,
  //       paid: payment?.status === "paid",
  //       attendance_map: attendance?.attendance_map ?? null,
  //     };
  //   });
const bills = users.map(u => {
  const attendance = attendanceMap[u.id];
  const payment = paymentMap[u.id];

  // ----------- FIX: Always use Date objects for math -----------
  const startDate = attendance?.first_attendance_date
    ? new Date(attendance.first_attendance_date)
    : new Date();

  const endDate = payment?.payment_date
    ? new Date(payment.payment_date)
    : new Date();

  // ----------- FIX: This will never be NaN now -----------
  const totalDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Allowed leave
  const allowedLeave = countAllowedLeaveDays(attendance?.attendance_map);

  // Final days billed
  const days = Math.max(totalDays - allowedLeave, 0);

  const perDay = Number(u.per_day_rate ?? 0);
  const total = Number((days * perDay).toFixed(2));

  return {
    user_id: u.id,
    name: u.name,
    email: u.email,
    status: u.status ?? "Active",

    // Convert to IST only for display
    start_date: toISTDate(startDate),
    end_date: toISTDate(endDate),

    days_billed: days,
    chosen_per_day_rate: perDay,
    total_amount: total,
    paid: payment?.status === "paid",
    note: payment?.note || null,
    attendance_map: attendance?.attendance_map ?? null,
  };
});

    console.log(bills[70]);
    return res.status(200).json(bills);

  } catch (err) {
    console.error("🔥 Error in /api/bills/fetch:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
