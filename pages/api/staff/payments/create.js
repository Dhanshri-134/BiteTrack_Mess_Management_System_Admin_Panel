import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { generateStaffSalaryForPeriod } from "@/lib/staffSalary";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { staff_id, amount, payment_type, payment_date, notes } = req.body;

    if (!staff_id || !amount || !payment_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const checkStaff = await pgPool.query(
      `SELECT id FROM staff WHERE id=$1 AND mess_id=$2`,
      [staff_id, messId]
    );

    if (checkStaff.rowCount === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const newPayment = await pgPool.query(
      `INSERT INTO staff_payments (staff_id, mess_id, amount, payment_type, payment_date, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        staff_id,
        messId,
        amount,
        payment_type,
        payment_date || new Date().toISOString().split('T')[0],
        notes || null
      ]
    );

    const effectiveDate = new Date(
      payment_date || new Date().toISOString().split("T")[0]
    );

    await generateStaffSalaryForPeriod({
      messId,
      month: effectiveDate.getMonth() + 1,
      year: effectiveDate.getFullYear(),
    });

    res.json({ success: true, data: newPayment.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
