import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { upsertManualStaffSalary } from "@/lib/staffSalary";

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
    const {
      staff_id,
      month,
      year,
      base_salary,
      overtime_amount,
      penalty_amount,
    } = req.body;

    if (!staff_id || !month || !year) {
      return res.status(400).json({ error: "staff_id, month and year are required" });
    }

    const staffCheck = await pgPool.query(
      `SELECT id
       FROM staff
       WHERE id=$1
         AND mess_id=$2
       LIMIT 1`,
      [staff_id, messId]
    );

    if (staffCheck.rowCount === 0) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const salaryRow = await upsertManualStaffSalary({
      messId,
      staffId: staff_id,
      month: Number(month),
      year: Number(year),
      baseSalary: Number(base_salary || 0),
      overtimeAmount: Number(overtime_amount || 0),
      penaltyAmount: Number(penalty_amount || 0),
    });

    res.json({ success: true, data: salaryRow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
