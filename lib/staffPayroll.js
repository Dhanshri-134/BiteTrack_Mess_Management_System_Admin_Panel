function padTime(value) {
  return String(value || "").slice(0, 5);
}

export const DEFAULT_STAFF_CHECK_OUT = "18:00";

export function normalizeAttendanceType(value) {
  const normalized = String(value || "P").trim().toUpperCase();

  if (normalized === "HF") return "H";
  if (normalized === "WEEKLY_OFF") return "OFF";
  if (normalized === "WEEK OFF") return "OFF";
  if (normalized === "WO") return "OFF";

  return normalized || "P";
}

export function buildTimestamp(attendanceDate, timeValue) {
  if (!attendanceDate || !timeValue) return null;
  return `${attendanceDate} ${padTime(timeValue)}:00`;
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((end - start) / 60000));
}

export function calculateAttendanceMetrics({
  attendanceDate,
  checkIn,
  checkOut,
  attendanceType = "P",
  lateAfter,
  shiftEnd,
  latePenalty = 0,
  overtimeRate = 0,
}) {
  const normalizedType = normalizeAttendanceType(attendanceType);
  const workingTypes = ["P", "H"];
  const nonWorkingTypes = ["A", "L", "OFF"];
  const resolvedCheckOut =
    workingTypes.includes(normalizedType)
      ? checkOut || shiftEnd || DEFAULT_STAFF_CHECK_OUT
      : checkOut;
  const checkInTs = buildTimestamp(attendanceDate, checkIn);
  const checkOutTs = buildTimestamp(attendanceDate, resolvedCheckOut);
  const lateAfterTs = buildTimestamp(attendanceDate, lateAfter);
  const shiftEndTs = buildTimestamp(attendanceDate, shiftEnd);

  let isLate = false;
  let lateMinutes = 0;
  let penaltyAmount = 0;
  let overtimeHours = 0;
  let overtimeAmount = 0;
  let workMinutes = 0;
  let finalType = normalizedType;

  if (checkInTs && lateAfterTs && !nonWorkingTypes.includes(normalizedType)) {
    const checkInDate = new Date(checkInTs);
    const lateAfterDate = new Date(lateAfterTs);
    isLate = checkInDate > lateAfterDate;

    if (isLate) {
      lateMinutes = minutesBetween(lateAfterDate, checkInDate);
      penaltyAmount = lateMinutes * Number(latePenalty || 0);

      if (lateMinutes > 120 && normalizedType === "P") {
        finalType = "H";
      }
    }
  }

  if (checkInTs && checkOutTs) {
    const inDate = new Date(checkInTs);
    const outDate = new Date(checkOutTs);
    workMinutes = minutesBetween(inDate, outDate);

    if (shiftEndTs && !nonWorkingTypes.includes(finalType)) {
      const shiftEndDate = new Date(shiftEndTs);
      if (outDate > shiftEndDate) {
        const overtimeMinutes = minutesBetween(shiftEndDate, outDate);
        overtimeHours = Number((overtimeMinutes / 60).toFixed(2));
        overtimeAmount = Number(
          (overtimeHours * Number(overtimeRate || 0)).toFixed(2)
        );
      }
    }
  }

  let finalCheckInTs = checkInTs;
  let finalCheckOutTs = checkOutTs;

  if (nonWorkingTypes.includes(finalType)) {
    finalCheckInTs = null;
    finalCheckOutTs = null;
    isLate = false;
    lateMinutes = 0;
    penaltyAmount = 0;
    overtimeHours = 0;
    overtimeAmount = 0;
    workMinutes = 0;
  }

  return {
    attendanceType: finalType,
    checkInTimestamp: finalCheckInTs,
    checkOutTimestamp: finalCheckOutTs,
    isLate,
    lateMinutes,
    penaltyAmount,
    overtimeHours,
    overtimeAmount,
    workMinutes,
  };
}

export function getAttendanceWeight(attendanceType) {
  switch (normalizeAttendanceType(attendanceType)) {
    case "H":
      return 0.5;
    case "L":
    case "P":
      return 1;
    case "OFF":
      return 0;
    default:
      return 0;
  }
}

export function calculateBaseEarnings({
  salaryType,
  baseSalary,
  payableUnits,
  totalWorkMinutes,
}) {
  const base = Number(baseSalary || 0);

  switch (salaryType) {
    case "daily":
      return Number((base * Number(payableUnits || 0)).toFixed(2));
    case "hourly":
      return Number((base * (Number(totalWorkMinutes || 0) / 60)).toFixed(2));
    default:
      return base;
  }
}
