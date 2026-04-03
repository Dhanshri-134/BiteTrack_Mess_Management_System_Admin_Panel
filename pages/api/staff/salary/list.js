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
    if (!token) {
      return res.status(401).json({ error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;
    const { month, year } = req.body;

    const result = await pgPool.query(
      `SELECT
        ss.id,
        s.id AS staff_id,
        s.name,
        s.phone,
        s.role,
        s.is_active,
        s.salary_type,
        s.base_salary AS configured_base_salary,
        COALESCE(ss.base_salary, 0) AS base_salary,
        COALESCE(ss.base_salary, 0) AS manual_salary,
        COALESCE(ss.overtime_amount, COALESCE(a.default_overtime_amount, 0), 0) AS overtime_amount,
        COALESCE(ss.penalty_amount, COALESCE(a.default_penalty_amount, 0), 0) AS penalty_amount,
        COALESCE(a.default_overtime_amount, 0) AS default_overtime_amount,
        COALESCE(a.default_penalty_amount, 0) AS default_penalty_amount,
        COALESCE(ss.base_salary, 0)
          + COALESCE(ss.overtime_amount, COALESCE(a.default_overtime_amount, 0), 0)
          - COALESCE(ss.penalty_amount, COALESCE(a.default_penalty_amount, 0), 0) AS gross_salary,
        CASE
          WHEN ss.id IS NULL THEN 0
          ELSE COALESCE(ss.final_salary, 0)
        END AS final_salary,
        CASE
          WHEN ss.id IS NULL THEN 'not_added'
          ELSE COALESCE(ss.payment_status, 'pending')
        END AS payment_status,
        ss.payment_date,
        COALESCE(p.total_paid, 0) AS total_paid,
        p.payments
      FROM staff s
      LEFT JOIN staff_salary ss
        ON ss.staff_id=s.id
       AND ss.mess_id=s.mess_id
       AND ss.month=$2
       AND ss.year=$3
      LEFT JOIN (
        SELECT
          staff_id,
          mess_id,
          EXTRACT(MONTH FROM attendance_date) AS attendance_month,
          EXTRACT(YEAR FROM attendance_date) AS attendance_year,
          COALESCE(SUM(overtime_amount), 0) AS default_overtime_amount,
          COALESCE(SUM(penalty_amount), 0) AS default_penalty_amount
        FROM staff_attendance
        GROUP BY
          staff_id,
          mess_id,
          EXTRACT(MONTH FROM attendance_date),
          EXTRACT(YEAR FROM attendance_date)
      ) a
        ON a.staff_id=s.id
       AND a.mess_id=s.mess_id
       AND a.attendance_month=$2
       AND a.attendance_year=$3
      LEFT JOIN (
        SELECT
          staff_id,
          mess_id,
          EXTRACT(MONTH FROM payment_date) AS pay_month,
          EXTRACT(YEAR FROM payment_date) AS pay_year,
          SUM(amount) AS total_paid,
          json_agg(
            json_build_object(
              'id', id,
              'payment_date', payment_date,
              'amount', amount,
              'payment_type', payment_type,
              'note', note
            ) ORDER BY payment_date DESC, id DESC
          ) AS payments
        FROM staff_payments
        GROUP BY staff_id, mess_id, EXTRACT(MONTH FROM payment_date), EXTRACT(YEAR FROM payment_date)
      ) p
        ON p.staff_id=s.id
       AND p.mess_id=s.mess_id
       AND p.pay_month=$2
       AND p.pay_year=$3
      WHERE s.mess_id=$1
      ORDER BY s.name`,
      [messId, month, year]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
