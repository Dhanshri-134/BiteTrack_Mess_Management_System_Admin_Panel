

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
      const receipt_number = await generateReceiptNumber(client, mess_id);

const result = await client.query(
  `INSERT INTO payment_history (
    user_id,
    payment_date,
    amount,
    month,
    year,
    receipt_number,
    payment_type,
    payment_method,
    upi_id,
    transaction_id,
    mess_id,
    status,
    note,
    created_at,
    updated_at
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'paid',$12,NOW(),NOW())
  RETURNING *`,
  [
    user_id,
    payment_date,
    amount,
    month,
    year,
    receipt_number,
    payment_type,
    payment_method,
    upi_id || null,
    transaction_id || null,
    mess_id,
    note || null,
  ]
);


      return res.status(200).json({ ok: true, payment: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("mark-paid error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
