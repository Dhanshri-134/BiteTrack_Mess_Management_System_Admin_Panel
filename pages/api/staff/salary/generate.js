import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { calculateBaseEarnings } from "@/lib/staffPayroll";

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

    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        error: "Month and year required"
      });
    }

    const staff = await pgPool.query(
      `SELECT id, base_salary, salary_type
       FROM staff
       WHERE mess_id=$1 AND is_active=true`,
      [messId]
    );

    const salaries = [];

    for (const s of staff.rows) {

      const attendance = await pgPool.query(
        `SELECT
            COUNT(*) FILTER (WHERE attendance_type='P') as present_days,
            COUNT(*) FILTER (WHERE attendance_type='A') as absent_days,
            COUNT(*) FILTER (WHERE attendance_type='H') as half_days,
            COUNT(*) FILTER (WHERE attendance_type='WO') as week_off_days,
            COUNT(*) FILTER (WHERE is_late=true) as late_days,
            SUM(overtime_amount) as overtime,
            SUM(penalty_amount) as penalty,
            SUM(work_minutes) as total_work_minutes,
            COALESCE(SUM(
              CASE attendance_type
                WHEN 'P' THEN 1
                WHEN 'H' THEN 0.5
                WHEN 'WO' THEN 1
                ELSE 0
              END
            ),0) as payable_units
        FROM staff_attendance
        WHERE mess_id=$1
        AND staff_id=$2
        AND EXTRACT(MONTH FROM attendance_date)=$3
        AND EXTRACT(YEAR FROM attendance_date)=$4`,
        [messId, s.id, month, year]
      );

      const presentDays = Number(attendance.rows[0].present_days || 0);
      const lateDays = Number(attendance.rows[0].late_days || 0);
      const overtime = Number(attendance.rows[0].overtime || 0);
      const penalty = Number(attendance.rows[0].penalty || 0);
      const totalWorkMinutes = Number(attendance.rows[0].total_work_minutes || 0);
      const payableUnits = Number(attendance.rows[0].payable_units || 0);
      const baseSalary = calculateBaseEarnings({
        salaryType: s.salary_type,
        baseSalary: s.base_salary,
        payableUnits,
        totalWorkMinutes
      });

      const payments = await pgPool.query(
        `SELECT COALESCE(SUM(amount),0) AS total_paid
         FROM staff_payments
         WHERE mess_id=$1
         AND staff_id=$2
         AND EXTRACT(MONTH FROM payment_date)=$3
         AND EXTRACT(YEAR FROM payment_date)=$4`,
        [messId, s.id, month, year]
      );

      const totalPaid = Number(payments.rows[0].total_paid || 0);
      const finalSalary = baseSalary + overtime - penalty - totalPaid;

await pgPool.query(
`INSERT INTO staff_salary
(
staff_id,
mess_id,
month,
year,
present_days,
late_days,
base_salary,
overtime_amount,
penalty_amount,
final_salary
)
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
ON CONFLICT (staff_id,month,year)
DO UPDATE SET
present_days=$5,
late_days=$6,
base_salary=$7,
overtime_amount=$8,
penalty_amount=$9,
final_salary=$10,
payment_status=CASE WHEN $10 <= 0 THEN 'paid' ELSE staff_salary.payment_status END`,
[
s.id,
messId,
month,
year,
presentDays,
lateDays,
baseSalary,
overtime,
penalty,
finalSalary
]
);
      salaries.push({
        staff_id: s.id,
        final_salary: finalSalary
      });

      await pgPool.query(
        `UPDATE staff
         SET current_balance=$1,
             updated_at=NOW()
         WHERE id=$2
         AND mess_id=$3`,
        [finalSalary, s.id, messId]
      );

    }

    res.json({
      success: true,
      generated: salaries.length
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
