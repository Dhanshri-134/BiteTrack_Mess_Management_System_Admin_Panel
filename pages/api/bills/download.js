

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
import { getLiveMonthlyBillingRows } from "../../../lib/billingLiveData";

function buildGroupedBills(rows) {
  const map = {};

  rows.forEach((row) => {
    const key = String(row.user_id);
    if (!map[key]) {
      map[key] = {
        ...row,
        pending_amount: 0,
        advance_amount: Number(row.advance_amount || 0),
        payable: 0,
        total_payable: 0,
        has_pending: false,
      };
    }

    const amount = Number(row.total_amount || 0);
    const paidAmount = Number(row.paid_amount || 0);

    map[key].payable += amount;
    map[key].start_date = row.start_date;
    map[key].end_date = row.end_date;

    if (!row.paid) {
      const diff = amount - paidAmount;
      map[key].pending_amount += diff > 0 ? diff : 0;
      map[key].has_pending = true;
    }
  });

  return Object.values(map).map((row) => ({
    ...row,
    total_payable: Math.max(
      0,
      Number(row.pending_amount || 0) - Number(row.advance_amount || 0)
    ),
  }));
}

function parsePayloadRows(req) {
  if (!req.body || typeof req.body !== "object") return null;

  const paidBills = Array.isArray(req.body.paidBills) ? req.body.paidBills : null;
  const unpaidBills = Array.isArray(req.body.unpaidBills) ? req.body.unpaidBills : null;

  if (!paidBills || !unpaidBills) return null;

  return { paidBills, unpaidBills };
}

function applySectionHeader(sheet, title, rowNumber) {
  sheet.mergeCells(`A${rowNumber}:E${rowNumber}`);
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = title;
  cell.font = { bold: true, size: 13 };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6FFFB" },
  };
}

function addTable(sheet, startRow, title, rows, valueKey) {
  applySectionHeader(sheet, title, startRow);
  const headerRow = sheet.addRow([
    "User",
    "Course / Hostel",
    "Parent",
    "Advance",
    valueKey === "paid_amount" ? "Paid Amount" : "Total Payable",
  ]);

  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF007170" },
  };

  rows.forEach((bill) => {
    sheet.addRow([
      `${bill.name || "-"}\n${bill.email || ""}\n${bill.mobile || ""}`,
      `${bill.course || "-"}\n${bill.hostel_name || "-"}\nRoom: ${bill.room_no || "-"}`,
      `${bill.parent_name || "-"}\n${bill.parent_mobile || "-"}`,
      Number(bill.advance_amount || 0).toFixed(2),
      Number(bill[valueKey] || 0).toFixed(2),
    ]);
  });

  return sheet.rowCount + 2;
}

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --------------------------------------------------
  // 1. JWT REQUIRED
  // --------------------------------------------------
  const headerAuth = req.headers.authorization;
  if (!headerAuth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = headerAuth.split(" ")[1];

  let messId;
  try {
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
    const payloadRows = parsePayloadRows(req);
    const liveRows =
      payloadRows
        ? null
        : await getLiveMonthlyBillingRows(pgPool, {
            messId,
            month,
            year,
          });

    const groupedRows = payloadRows
      ? [...payloadRows.paidBills, ...payloadRows.unpaidBills]
      : buildGroupedBills(liveRows || []);

    const paidBills = payloadRows
      ? payloadRows.paidBills
      : groupedRows.filter((bill) => !bill.has_pending);
    const unpaidBills = payloadRows
      ? payloadRows.unpaidBills
      : groupedRows.filter((bill) => bill.has_pending);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Billing Report");

    sheet.columns = [
      { width: 32 },
      { width: 30 },
      { width: 26 },
      { width: 14 },
      { width: 16 },
    ];

    sheet.addRow([`Billing Month: ${month}/${year}`]);
    sheet.getCell("A1").font = { bold: true, size: 14 };
    sheet.mergeCells("A1:E1");
    sheet.addRow([]);

    let nextRow = 3;
    nextRow = addTable(sheet, nextRow, "Paid Users", paidBills, "paid_amount");
    nextRow = addTable(sheet, nextRow, "Unpaid Users", unpaidBills, "total_payable");

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.alignment = { vertical: "top", wrapText: true };
    });

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
