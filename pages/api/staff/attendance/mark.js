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
    if (!token) return res.status(401).json({ error: "Token required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const {
      staff_id,
      attendance_date,
      check_in,
      check_out,
      overtime_hours,
      penalty_amount
    } = req.body;

    const checkInTimestamp = check_in
  ? `${attendance_date} ${check_in}`
  : null;

const checkOutTimestamp = check_out
  ? `${attendance_date} ${check_out}`
  : null;
    

    const staffRes = await pgPool.query(
      `SELECT overtime_rate, late_after
      FROM staff
      WHERE id=$1 AND mess_id=$2`,
      [staff_id, messId]
      );

      if (staffRes.rowCount === 0) {
  return res.status(404).json({ error: "Staff not found" });
}

const overtimeRate = staffRes.rows[0]?.overtime_rate || 0;
const lateAfter = staffRes.rows[0]?.late_after;
    const overtimeAmount =
(Number(overtime_hours) || 0) * overtimeRate;
    const lateLimit = new Date(`${attendance_date} ${lateAfter}`);
const checkInTime = new Date(checkInTimestamp);

let isLate = false;
let lateMinutes = 0;

if (checkInTimestamp && lateAfter) {

  const lateLimit = new Date(`${attendance_date} ${lateAfter}`);
  const checkInTime = new Date(checkInTimestamp);

  isLate = checkInTime > lateLimit;

  if (isLate) {
    lateMinutes = Math.floor((checkInTime - lateLimit) / 60000);
  }

}

    await pgPool.query(
      `INSERT INTO staff_attendance
      (
        staff_id,
        mess_id,
        attendance_date,
        check_in,
        check_out,
        is_late,
        late_minutes,
        Number(overtime_hours) || 0,,
        overtime_amount,
        penalty_amount
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (staff_id, attendance_date)
      DO UPDATE SET
        check_in=$4,
        check_out=$5,
        is_late=$6,
        late_minutes=$7,
        overtime_hours=$8,
        overtime_amount=$9,
        penalty_amount=$10`,
      [
        staff_id,
        messId,
        attendance_date,
        checkInTimestamp,
checkOutTimestamp,
        isLate,
        lateMinutes,
        overtime_hours,
        overtimeAmount,
        penalty_amount
      ]
    );

    res.json({ success: true });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}