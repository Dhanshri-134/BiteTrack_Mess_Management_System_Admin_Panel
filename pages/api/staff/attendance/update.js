import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { calculateAttendanceMetrics } from "@/lib/staffPayroll";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Token required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;
    const {
      id,
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

    const metrics = calculateAttendanceMetrics({
      attendanceDate: attendance_date,
      checkIn: check_in,
      checkOut: check_out,
      attendanceType: attendance_type || "P",
      lateAfter: staffRes.rows[0].late_after,
      shiftEnd: staffRes.rows[0].shift_end,
      latePenalty: staffRes.rows[0].late_penalty,
      overtimeRate: staffRes.rows[0].overtime_rate,
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
      `UPDATE staff_attendance
       SET check_in=$1,
           check_out=$2,
           attendance_type=$3,
           is_late=$4,
           late_minutes=$5,
           overtime_hours=$6,
           overtime_amount=$7,
           penalty_amount=$8,
           work_minutes=$9,
           notes=$10,
           updated_at=NOW()
       WHERE id=$11
       AND staff_id=$12
       AND mess_id=$13`,
      [
        metrics.checkInTimestamp,
        metrics.checkOutTimestamp,
        metrics.attendanceType,
        metrics.isLate,
        metrics.lateMinutes,
        metrics.overtimeHours,
        resolvedOvertimeAmount,
        resolvedPenaltyAmount,
        metrics.workMinutes,
        notes || null,
        id,
        staff_id,
        messId,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
