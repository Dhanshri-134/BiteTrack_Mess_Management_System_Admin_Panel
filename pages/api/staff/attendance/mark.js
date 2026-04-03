import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { calculateAttendanceMetrics } from "@/lib/staffPayroll";

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
      attendance_type,
      notes,
      overtime_amount,
      penalty_amount,
    } = req.body;
    

    const staffRes = await pgPool.query(
      `SELECT overtime_rate, late_after, late_penalty, shift_end
      FROM staff
      WHERE id=$1 AND mess_id=$2`,
      [staff_id, messId]
      );

      if (staffRes.rowCount === 0) {
  return res.status(404).json({ error: "Staff not found" });
}

const staffRow = staffRes.rows[0];
const metrics = calculateAttendanceMetrics({
  attendanceDate: attendance_date,
  checkIn: check_in,
  checkOut: check_out,
  attendanceType: attendance_type || "P",
  lateAfter: staffRow.late_after,
  shiftEnd: staffRow.shift_end,
  latePenalty: staffRow.late_penalty,
  overtimeRate: staffRow.overtime_rate,
});
const resolvedOvertimeAmount =
  overtime_amount !== undefined && overtime_amount !== null
    ? Number(overtime_amount || 0)
    : metrics.overtimeAmount;
const resolvedPenaltyAmount =
  penalty_amount !== undefined && penalty_amount !== null
    ? Number(penalty_amount || 0)
    : metrics.penaltyAmount;

    await pgPool.query(
      `INSERT INTO staff_attendance
      (
        staff_id,
        mess_id,
        attendance_date,
        check_in,
        check_out,
        attendance_type,
        is_late,
        late_minutes,
        overtime_hours,
        overtime_amount,
        penalty_amount,
        work_minutes,
        notes
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (staff_id, attendance_date)
      DO UPDATE SET
        check_in=$4,
        check_out=$5,
        attendance_type=$6,
        is_late=$7,
        late_minutes=$8,
        overtime_hours=$9,
        overtime_amount=$10,
        penalty_amount=$11,
        work_minutes=$12,
        notes=$13,
        updated_at=NOW()`,
      [
        staff_id,
        messId,
        attendance_date,
        metrics.checkInTimestamp,
        metrics.checkOutTimestamp,
        metrics.attendanceType,
        metrics.isLate,
        metrics.lateMinutes,
        metrics.overtimeHours,
        resolvedOvertimeAmount,
        resolvedPenaltyAmount,
        metrics.workMinutes,
        notes || null
      ]
    );

    res.json({ success: true });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
