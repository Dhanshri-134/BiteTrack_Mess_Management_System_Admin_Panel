const ISO_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeAttendanceStatus(value) {
  if (value === true || value === false || value === null) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "present", "p", "1", "yes"].includes(normalized)) {
      return true;
    }

    if (["false", "absent", "a", "0", "no"].includes(normalized)) {
      return false;
    }

    if (["null", "", "none", "na", "n/a"].includes(normalized)) {
      return null;
    }
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return null;
}

export function normalizeAttendanceMap(attendanceMap) {
  if (!attendanceMap || typeof attendanceMap !== "object" || Array.isArray(attendanceMap)) {
    return {};
  }

  return Object.entries(attendanceMap)
    .filter(([dateKey]) => ISO_DATE_KEY_PATTERN.test(String(dateKey)))
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .reduce((result, [dateKey, value]) => {
      result[dateKey] = normalizeAttendanceStatus(value);
      return result;
    }, {});
}
