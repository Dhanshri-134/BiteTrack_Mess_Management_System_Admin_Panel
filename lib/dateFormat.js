function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDisplayDate(value) {
  const date = toDate(value);
  if (!date) return "-";
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function formatDayOfMonth(value) {
  const date = toDate(value);
  if (!date) return "";
  return String(date.getDate());
}
