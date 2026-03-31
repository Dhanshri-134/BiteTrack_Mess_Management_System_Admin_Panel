import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

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

    const now = new Date();
    const salaryRow = salaryRes.rows[0];
    const grossSalary =
      Number(salaryRow.base_salary || 0) +
      Number(salaryRow.overtime_amount || 0) -
      Number(salaryRow.penalty_amount || 0);
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

    const payments = await pgPool.query(
      `SELECT COALESCE(SUM(amount),0) AS total_paid
       FROM staff_payments
       WHERE mess_id=$1
       AND staff_id=$2
       AND EXTRACT(MONTH FROM payment_date)=$3
       AND EXTRACT(YEAR FROM payment_date)=$4`,
      [messId, salaryRow.staff_id, salaryRow.month, salaryRow.year]
    );

    const totalPaid = Number(payments.rows[0].total_paid || 0);
    const remaining = Number((grossSalary - totalPaid).toFixed(2));

    await pgPool.query(
      `UPDATE staff_salary
       SET payment_status=$1,
           payment_date=$2,
           final_salary=$3
       WHERE id=$4
       AND mess_id=$5`,
      [
        remaining <= 0 ? "paid" : "partial",
        payment_date || new Date().toISOString().slice(0, 10),
        Math.max(remaining, 0),
        salary_id,
        messId,
      ]
    );

    const isCurrentPeriod =
      Number(salaryRow.month) === now.getMonth() + 1 &&
      Number(salaryRow.year) === now.getFullYear();

    if (isCurrentPeriod) {
      await pgPool.query(
        `UPDATE staff
         SET current_balance=$1,
             updated_at=NOW()
         WHERE id=$2
         AND mess_id=$3`,
        [remaining, salaryRow.staff_id, messId]
      );
    }

    res.json({ success: true, remaining_balance: remaining });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
