// // pages/api/bills/mark-paid.js
// import { pgPool } from "../../../lib/db";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const auth = req.headers.authorization;
//     if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const messId = decoded.messId;
//     if (!messId) return res.status(401).json({ error: "Invalid token" });

//     const {
//       user_id,
//       amount,
//       month,
//       year,
//       receipt_number,
//       payment_type,
//       payment_method,
//       upi_id,
//       transaction_id,
//     } = req.body;

//     if (!user_id || !amount || !month || !year || !receipt_number) {
//       return res.status(400).json({ error: "Required fields missing" });
//     }

//     // Insert into payment_history
//     const insertQuery = `
//       INSERT INTO payment_history
//       (user_id, amount, month, year, receipt_number, status, payment_type, payment_method, upi_id, transaction_id, mess_id, payment_date)
//       VALUES ($1,$2,$3,$4,$5,'paid',$6,$7,$8,$9,$10,NOW())
//       RETURNING *
//     `;

//     const { rows } = await pgPool.query(insertQuery, [
//       user_id,
//       amount,
//       month,
//       year,
//       receipt_number,
//       payment_type,
//       payment_method,
//       upi_id,
//       transaction_id,
//       messId,
//     ]);

//     return res.status(200).json({ success: true, payment: rows[0] });
//   } catch (err) {
//     console.error("Error in mark-paid:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }








// pages/api/bills/mark-paid.js
import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

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
      amount,
      payment_type,
      payment_method,
      upi_id,
      transaction_id,
      payment_date,
      note,
    } = req.body;

    // ✅ Validate required fields
    if (!user_id ||month === undefined ||
  amount === undefined || !payment_type || !payment_method || !payment_date) {
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
      const result = await client.query(
        `INSERT INTO payment_history (
          user_id,
          payment_date,
          amount,
          month,
          year,
          payment_type,
          payment_method,
          upi_id,
          transaction_id,
          mess_id,
          status,
          note,
          created_at,
          updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'paid', $11,NOW(),NOW())
        RETURNING *`,
        [
          user_id,
          payment_date,
          amount,
          month,
          new Date().getFullYear(), // current year
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
