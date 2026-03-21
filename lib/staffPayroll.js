function padTime(value) {
  return String(value || "").slice(0, 5);
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
  const normalizedType = attendanceType || "P";
  const checkInTs = buildTimestamp(attendanceDate, checkIn);
  const checkOutTs = buildTimestamp(attendanceDate, checkOut);
  const lateAfterTs = buildTimestamp(attendanceDate, lateAfter);
  const shiftEndTs = buildTimestamp(attendanceDate, shiftEnd);

  let isLate = false;
  let lateMinutes = 0;
  let penaltyAmount = 0;
  let overtimeHours = 0;
  let overtimeAmount = 0;
  let workMinutes = 0;
  let finalType = normalizedType;

  if (checkInTs && lateAfterTs && !["A", "WO"].includes(normalizedType)) {
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

    if (shiftEndTs && !["A", "WO"].includes(finalType)) {
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

  if (["A", "WO"].includes(finalType)) {
    isLate = false;
    lateMinutes = 0;
    penaltyAmount = 0;
    overtimeHours = 0;
    overtimeAmount = 0;
    if (finalType === "A") {
      workMinutes = 0;
    }
  }

  return {
    attendanceType: finalType,
    checkInTimestamp: checkInTs,
    checkOutTimestamp: checkOutTs,
    isLate,
    lateMinutes,
    penaltyAmount,
    overtimeHours,
    overtimeAmount,
    workMinutes,
  };
}

export function getAttendanceWeight(attendanceType) {
  switch (attendanceType) {
    case "H":
      return 0.5;
    case "WO":
      return 1;
    case "P":
      return 1;
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
