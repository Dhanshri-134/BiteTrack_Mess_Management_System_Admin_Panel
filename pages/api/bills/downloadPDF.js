// pages/api/bills/downloadPDF.js
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  // -------------------------------------------------------------
  // 1. AUTHENTICATE JWT
  // -------------------------------------------------------------
const headerAuth = req.headers.authorization;
const queryToken = req.query.token;

let token;

if (headerAuth && headerAuth.startsWith("Bearer ")) {
  token = headerAuth.split(" ")[1];
} else if (queryToken) {
  token = queryToken;
} else {
  return res.status(401).json({ error: "Unauthorized" });
}
  let messId;
  try {
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    messId = decoded.messId;
    if (!messId) return res.status(401).json({ error: "Invalid token" });
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { month, year } = req.query;
  if (!month || !year)
    return res.status(400).json({ error: "Month and year required" });

  try {
    // -------------------------------------------------------------
    // 2. FETCH USERS
    // -------------------------------------------------------------
    const usersQuery = `
      SELECT u.id, u.name, u.email, m.per_day_rate
      FROM users u
      JOIN messes m ON u.mess_id = m.id
      WHERE u.mess_id = $1
      ORDER BY u.name
    `;
    const { rows: users } = await pgPool.query(usersQuery, [messId]);

    // -------------------------------------------------------------
    // 3. FETCH ATTENDANCE
    // -------------------------------------------------------------
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
    attendanceRows.forEach((a) => {
      attendanceMap[a.user_id] = a;
    });

    // -------------------------------------------------------------
    // 4. FETCH PAYMENTS
    // -------------------------------------------------------------
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
    paymentRows.forEach((p) => {
      paymentMap[p.user_id] = p;
    });

    // -------------------------------------------------------------
    // 5. CREATE PDF DOCUMENT
    // -------------------------------------------------------------
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Mess_billing_${year}_${month}.pdf`
    );

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    doc.pipe(res);

    // Title
    doc.fontSize(20).text(`Mess Monthly Billing`, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(14).text(`Month: ${month}   Year: ${year}`, {
      align: "center",
    });

    doc.moveDown(1);

    // -------------------------------------------------------------
    // 6. TABLE HEADER
    // -------------------------------------------------------------
    const tableTop = doc.y;
    const colWidths = [40, 100, 140, 30, 50, 70, 70, 80];

    const headers = [
      "Sr",
      "Name",
      "Email",
      "Days",
      "Rate",
      "Total",
      "Status",
      "Start Date",
    ];

    drawRow(doc, tableTop, headers, colWidths, true);

    // -------------------------------------------------------------
    // 7. TABLE BODY (MULTI-PAGE SAFE)
    // -------------------------------------------------------------
    let y = tableTop + 25;

    users.forEach((u, index) => {
      const att = attendanceMap[u.id];
      const pay = paymentMap[u.id];

      const days = att?.days_present ?? 0;
      const rate = Number(u.per_day_rate ?? 0);
      const total = (days * rate).toFixed(2);

      const startDate = att?.first_attendance_date
        ? new Date(att.first_attendance_date).toISOString().slice(0, 10)
        : "-";

      const row = [
        index + 1,
        u.name,
        u.email,
        days,
        rate.toFixed(2),
        total,
        pay?.status === "paid" ? "Paid" : "Unpaid",
        startDate,
      ];

      // Page break check
      if (y > 760) {
        doc.addPage();
        y = 40;
        drawRow(doc, y, headers, colWidths, true);
        y += 25;
      }

      drawRow(doc, y, row, colWidths, false);
      y += 25;
    });

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    return res.status(500).json({ error: "PDF generation failed" });
  }
}

// -------------------------------------------------------------
// HELPER: Draw a table row
// -------------------------------------------------------------
function drawRow(doc, y, row, widths, isHeader) {
  let x = 30;

  row.forEach((cell, i) => {
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isHeader ? 11 : 10)
      .text(String(cell), x + 2, y, {
        width: widths[i] - 4,
        align: "left",
      });

    // Row border
    doc.rect(x, y - 2, widths[i], 22).stroke();

    x += widths[i];
  });
}
