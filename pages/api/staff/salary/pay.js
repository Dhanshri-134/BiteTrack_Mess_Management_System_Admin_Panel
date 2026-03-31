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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;

    const {
      salary_id,
      amount,
      payment_type = "final",
      payment_mode = "cash",
      note,
      payment_date,
    } = req.body;

    const salaryRes = await pgPool.query(
      `SELECT id, staff_id, month, year, base_salary, overtime_amount, penalty_amount, final_salary
       FROM staff_salary
       WHERE id=$1
       AND mess_id=$2
       LIMIT 1`,
      [salary_id, messId]
    );

    if (salaryRes.rowCount === 0) {
      return res.status(404).json({ error: "Salary record not found" });
    }

    const salaryRow = salaryRes.rows[0];
    const payAmount = Number(amount || salaryRow.final_salary || 0);

    await pgPool.query(
      `INSERT INTO staff_payments
       (staff_id, mess_id, payment_date, amount, payment_type, payment_mode, note)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        salaryRow.staff_id,
        messId,
        payment_date || new Date().toISOString().slice(0, 10),
        payAmount,
        payment_type,
        payment_mode,
        note || null,
      ]
    );

    await generateStaffSalaryForPeriod({
      messId,
      month: Number(salaryRow.month),
      year: Number(salaryRow.year),
    });

    const refreshedSalary = await pgPool.query(
      `SELECT final_salary, payment_status
       FROM staff_salary
       WHERE id=$1
         AND mess_id=$2
       LIMIT 1`,
      [salary_id, messId]
    );

    res.json({
      success: true,
      remaining_balance: Number(refreshedSalary.rows[0]?.final_salary || 0),
      payment_status: refreshedSalary.rows[0]?.payment_status || "pending",
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
