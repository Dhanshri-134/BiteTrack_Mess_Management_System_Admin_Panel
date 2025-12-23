

// // pages/api/bills/download.js
// import { pgPool } from "../../../lib/db";
// import jwt from "jsonwebtoken";
// import ExcelJS from "exceljs";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   // --------------------------------------------------
//   // 1. Token REQUIRED
//   // --------------------------------------------------
//   const auth = req.headers.authorization;
//   if (!auth || !auth.startsWith("Bearer ")) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   let messId;
//   try {
//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     messId = decoded.messId;
//     if (!messId) {
//       return res.status(401).json({ error: "Invalid token" });
//     }
//   } catch (err) {
//     console.error("JWT error:", err);
//     return res.status(401).json({ error: "Invalid/Expired token" });
//   }

//   const { month, year } = req.query;
//   if (!month || !year) {
//     return res.status(400).json({ error: "Month and year required" });
//   }

//   try {
//     // --------------------------------------------------
//     // 2. FETCH EVERYTHING SHOWN IN UI
//     //    - users
//     //    - bills
//     //    - mess rate
//     //    - attendance fallback
//     //    - payment status + paid_at
//     // --------------------------------------------------
//     const query = `
//       SELECT 
//         u.id AS user_id,
//         u.name,
//         u.email,

//         -- Bill data
//         COALESCE(b.days_billed, 0) AS bill_days,
//         COALESCE(b.per_day_rate, m.per_day_rate, 0) AS bill_rate,
//         b.total_amount AS bill_total,
//         b.generated_at,

//         -- Attendance fallback
//         (
//           SELECT COUNT(*)
//           FROM attendance a
//           WHERE a.user_id = u.id
//           AND EXTRACT(MONTH FROM a.date) = $1
//           AND EXTRACT(YEAR  FROM a.date) = $2
//         ) AS attendance_days,

//         -- Payment status
//         COALESCE(p.paid, false) AS paid,
//         p.paid_at AS paid_at

//       FROM users u
//       LEFT JOIN bills b 
//         ON b.user_id = u.id AND b.month = $1 AND b.year = $2
//       LEFT JOIN messes m
//         ON m.id = u.mess_id
//       LEFT JOIN payments p
//         ON p.user_id = u.id AND p.month = $1 AND p.year = $2
//       WHERE u.mess_id = $3
//       ORDER BY u.name`;

//     const { rows } = await pgPool.query(query, [month, year, messId]);

//     // --------------------------------------------------
//     // 3. Create Excel workbook
//     // --------------------------------------------------
//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Billing Records");

//     // HEADER (Matches UI Table)
//     sheet.addRow([
//       "Sr No",
//       "Name",
//       "Email",
//       "Days",
//       "Rate",
//       "Total Amount",
//       "Payment Status",
//       "Payment Date",
//       "Bill Generated At",
//     ]);

//     // --------------------------------------------------
//     // 4. Process UI logic row-by-row
//     // --------------------------------------------------
//     rows.forEach((row, idx) => {
//       // DAYS: bill_days → fallback attendance_days
//       const days =
//         Number(row.bill_days) !== 0
//           ? Number(row.bill_days)
//           : Number(row.attendance_days);

//       const rate = Number(row.bill_rate || 0);
//       const total = days * rate;

//       sheet.addRow([
//         idx + 1,
//         row.name,
//         row.email,
//         days,
//         rate.toFixed(2),
//         total.toFixed(2),
//         row.paid ? "Paid" : "Unpaid",
//         row.paid_at ? new Date(row.paid_at).toLocaleString() : "-",
//         row.generated_at
//           ? new Date(row.generated_at).toLocaleString()
//           : "-",
//       ]);
//     });

//     // --------------------------------------------------
//     // 5. SEND FILE
//     // --------------------------------------------------
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=billing_${year}_${month}.xlsx`
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (err) {
//     console.error("Excel export error:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }





















// pages/api/bills/download.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";

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

  // --------------------------------------------------
  // 1. JWT REQUIRED
  // --------------------------------------------------
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let messId;
  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    messId = decoded.messId;
    if (!messId) {
      return res.status(401).json({ error: "Invalid token" });
    }
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: "Month and year required" });
  }

  try {
    // --------------------------------------------------
    // 2. FETCH USERS
    // --------------------------------------------------
    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        m.per_day_rate
      FROM users u
      JOIN messes m ON u.mess_id = m.id
      WHERE u.mess_id = $1
      ORDER BY u.name
    `;
    const { rows: users } = await pgPool.query(usersQuery, [messId]);

    // --------------------------------------------------
    // 3. FETCH MONTHLY ATTENDANCE
    // --------------------------------------------------
    const attendanceQuery = `
      SELECT user_id, days_present, attendance_map, first_attendance_date
      FROM monthly_attendance
      WHERE mess_id = $1 AND month = $2 AND year = $3
    `;

    const { rows: attendanceRows } = await pgPool.query(attendanceQuery, [
      messId,
      Number(month),
      Number(year),
    ]);

    const attendanceMap = {};
    attendanceRows.forEach(a => {
      attendanceMap[a.user_id] = a;
    });

    // --------------------------------------------------
    // 4. FETCH PAYMENT HISTORY
    // --------------------------------------------------
    const paymentsQuery = `
      SELECT user_id, payment_date, amount, status
      FROM payment_history
      WHERE mess_id = $1
        AND (
          CASE
            WHEN month ~ '^[0-9]+$' THEN CAST(month AS INTEGER)
            ELSE EXTRACT(MONTH FROM TO_DATE(month, 'Month'))
          END
        ) = $2
        AND year = $3
    `;

    const { rows: paymentRows } = await pgPool.query(paymentsQuery, [
      messId,
      month,
      Number(year),
    ]);

    const paymentMap = {};
    paymentRows.forEach(p => {
      paymentMap[p.user_id] = p;
    });

    // --------------------------------------------------
    // 5. Prepare Excel sheet
    // --------------------------------------------------
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Billing");

    sheet.addRow([
      "Sr No",
      "Name",
      "Email",
      "Days Present",
      "Rate",
      "Total Amount",
      "Payment Status",
      "Start Date",
    ]);

    // --------------------------------------------------
    // 6. Generate each row from combined data
    // --------------------------------------------------
    users.forEach((u, index) => {
      const att = attendanceMap[u.id];
      const pay = paymentMap[u.id];

      const days = att?.days_present ?? 0;
      const rate = Number(u.per_day_rate ?? 0);
      const total = (days * rate).toFixed(2);

      const startDate = att?.first_attendance_date
        ? new Date(att.first_attendance_date).toISOString().slice(0, 10)
        : "-";


      sheet.addRow([
        index + 1,
        u.name,
        u.email,
        days,
        rate.toFixed(2),
        total,
        pay?.status === "paid" ? "Paid" : "Unpaid",
        
        startDate,
        
      ]);
    });

    // --------------------------------------------------
    // 7. Send Excel File
    // --------------------------------------------------
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Mess_billing_${year}_${month}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
