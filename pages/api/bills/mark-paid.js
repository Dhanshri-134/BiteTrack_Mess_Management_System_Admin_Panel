

// pages/api/bills/mark-paid.js
import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

async function generateReceiptNumber(client, mess_id) {
  const year = new Date().getFullYear();

  // Get mess prefix
  const messRes = await client.query(
    `SELECT prefix FROM messes WHERE id = $1`,
    [mess_id]
  );

  const prefix = messRes.rows[0]?.prefix || "SM";

  // Get last receipt number
  const lastRes = await client.query(
    `
    SELECT receipt_number
    FROM payment_history
    WHERE receipt_number LIKE $1
    ORDER BY receipt_number DESC
    LIMIT 1
    `,
    [`R${prefix}${year}%`]
  );

  let next = 1;

  if (lastRes.rows.length) {
    const last = lastRes.rows[0].receipt_number;
    const lastNum = parseInt(last.slice(-6), 10) || 0;
    next = lastNum + 1;
  }

  return `R${prefix}${year}${String(next).padStart(6, "0")}`;
}
function normalizeMonth(monthInput) {
  const monthMap = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  };

  if (monthMap[monthInput]) return monthMap[monthInput];

  return monthInput; // if already text
}
function generateCashTransactionId() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return `CASH-${dd}${mm}${yyyy}-${hh}${min}`;
}

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // ✅ Auth

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const mess_id =decoded.messId;
    if (!mess_id)
      return res.status(400).json({ error: "messId missing in token" });

    const {
      user_id,
      month,
      year,
      amount,
      payment_type,
      payment_method,
      upi_id,
      transaction_id,
      payment_date,
      leave_days,
      billing_start_date,
      billing_end_date,
      note,
    } = req.body;

    // ✅ Validate required fields
    if (!user_id ||month == null ||
  year == null ||
  amount == null || !payment_type || !payment_method || !payment_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    if (!["monthly", "daily"].includes(payment_type)) {
      return res.status(400).json({ error: "Invalid payment_type" });
    }
    
    if (!["Cash", "UPI"].includes(payment_method)) {
      return res.status(400).json({ error: "Invalid payment_method" });
    }
    
    const client = await pgPool.connect();
    
    try {
await client.query("BEGIN");
      let finalTransactionId = transaction_id;

      if (payment_method === "Cash") {
        finalTransactionId = generateCashTransactionId();
      }
      const normalizedMonth = normalizeMonth(month);

      const existingRes = await client.query(`
        SELECT id FROM payment_history 
        WHERE user_id = $1 AND mess_id = $2 AND month = $3 AND year = $4
        LIMIT 1
      `, [user_id, mess_id, normalizedMonth, year]);

      let result;
      if (existingRes.rows.length > 0) {
        const ph_id = existingRes.rows[0].id;
        result = await client.query(`
          UPDATE payment_history
          SET 
            amount = $1, payment_type = $2, payment_method = $3, 
            upi_id = $4, transaction_id = $5, payment_date = $6, 
            leave_days = $7, billing_start_date = $8, billing_end_date = $9, 
            note = $10, updated_at = NOW()
          WHERE id = $11
          RETURNING *
        `, [
          amount, payment_type, payment_method, 
          upi_id || null, finalTransactionId || null, payment_date, 
          leave_days || 0, billing_start_date || null, billing_end_date || null, 
          note || null, ph_id
        ]);
      } else {
        const receipt_number = await generateReceiptNumber(client, mess_id);

        result = await client.query(`
          INSERT INTO payment_history (
            user_id, payment_date, amount, month, year, receipt_number, 
            payment_type, payment_method, upi_id, transaction_id, 
            mess_id, status, leave_days, billing_start_date, billing_end_date, 
            note, created_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
            'paid',
            $12,$13,$14,$15,
            NOW(),NOW()
          ) RETURNING *
        `, [
          user_id, payment_date, amount, normalizedMonth, year, receipt_number,
          payment_type, payment_method, upi_id || null, finalTransactionId || null,
          mess_id, leave_days || 0, billing_start_date || null, billing_end_date || null,
          note || null
        ]);
      }

      await client.query("COMMIT");
      return res.status(200).json({ ok: true, payment: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("mark-paid error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
