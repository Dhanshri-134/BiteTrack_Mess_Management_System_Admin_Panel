function parseSlashDate(value) {
  const match = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const slashDate = parseSlashDate(text);
  if (slashDate) return slashDate;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isoDate(value) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function normalizeMonthNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Number(text);

  const parsed = new Date(`${text} 1, 2000`);
  const month = parsed.getMonth() + 1;
  return Number.isNaN(month) ? null : month;
}

function buildDateRange(startISO, endISO, buildValue) {
  if (!startISO || !endISO || startISO > endISO) return {};

  const result = {};
  const current = new Date(`${startISO}T00:00:00.000Z`);
  const end = new Date(`${endISO}T00:00:00.000Z`);

  while (current <= end) {
    const currentISO = isoDate(current);
    result[currentISO] = buildValue(currentISO);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}

function buildMonthlyAttendanceMap({
  monthStartISO,
  monthEndISO,
  firstAttendanceISO,
  activeStartISO,
  activeEndISO,
  presentDates,
}) {
  return buildDateRange(monthStartISO, monthEndISO, (dateKey) => {
    if (!firstAttendanceISO || dateKey < firstAttendanceISO) return null;
    if (dateKey < activeStartISO || dateKey > activeEndISO) return null;
    return presentDates.has(dateKey);
  });
}

function sqlMonthToNumberExpression(columnName = "month") {
  return `
    CASE
      WHEN CAST(${columnName} AS text) ~ '^[0-9]+$' THEN CAST(${columnName} AS INTEGER)
      ELSE EXTRACT(MONTH FROM TO_DATE(CAST(${columnName} AS text), 'Month'))
    END
  `;
}

export function getMaxConsecutiveAbsences(attendanceMap, startISO = null, endISO = null) {
  if (!attendanceMap || typeof attendanceMap !== "object") return 0;

  const dates = Object.keys(attendanceMap).sort();
  let max = 0;
  let streak = 0;

  for (const dateKey of dates) {
    if (startISO && dateKey < startISO) continue;
    if (endISO && dateKey > endISO) continue;

    if (attendanceMap[dateKey] !== false) {
      streak = 0;
      continue;
    }

    streak += 1;
    max = Math.max(max, streak);
  }

  return max;
}

export function calculateDaysBilled(attendanceMap, billingStartISO, billingEndISO) {
  const allDates = Object.keys(attendanceMap || {}).sort();
  if (allDates.length === 0 || !billingStartISO || !billingEndISO || billingStartISO > billingEndISO) {
    return 0;
  }

  const firstPresent = allDates.find((dateKey) => attendanceMap[dateKey] === true);
  if (!firstPresent) return 0;

  let current = new Date(`${firstPresent}T00:00:00.000Z`);
  const end = new Date(`${billingEndISO}T00:00:00.000Z`);

  let total = 0;
  let consecutiveAbsent = 0;
  let subtract = 0;

  while (current <= end) {
    const currentISO = isoDate(current);
    const status = attendanceMap[currentISO];

    if (status === false) {
      consecutiveAbsent += 1;
    } else {
      if (consecutiveAbsent > 10) subtract += consecutiveAbsent;
      consecutiveAbsent = 0;
    }

    total += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  if (consecutiveAbsent > 10) subtract += consecutiveAbsent;

  return Math.max(0, total - subtract);
}

export async function getLiveMonthlyBillingRows(db, { messId, month, year }) {
  const numericMonth = normalizeMonthNumber(month);
  const numericYear = Number(year);

  if (!messId || !numericMonth || !numericYear) {
    throw new Error("messId, month, and year are required");
  }

  const monthStart = new Date(Date.UTC(numericYear, numericMonth - 1, 1));
  const monthEnd = new Date(Date.UTC(numericYear, numericMonth, 0));
  const monthStartISO = isoDate(monthStart);
  const monthEndISO = isoDate(monthEnd);

  const usersQuery = `
    SELECT
      u.id AS user_id,
      u.mess_id,
      u.name,
      u.email,
      COALESCE(u.status, 'Active') AS status,
      u.phone AS mobile,
      p.name AS parent_name,
      p.contact AS parent_mobile,
      u.course,
      u.hostel_name,
      u.room_no,
      u.date_of_joining,
      u.freeze_date,
      u.unfreeze_date,
      m.per_day_rate,
      m.monthly_price,
      m.allowed_leave_days
    FROM users u
    JOIN messes m ON m.id = u.mess_id
    LEFT JOIN parents p
      ON p.user_id = u.id
      AND p.mess_id = u.mess_id
    WHERE u.mess_id = $1
      AND u.verified = TRUE
      AND COALESCE(u.status, 'Active') = 'Active'
    ORDER BY u.name
  `;

  const billingViewQuery = `
    SELECT
      user_id,
      year,
      month,
      days_billed,
      chosen_per_day_rate,
      total_amount,
      start_date,
      end_date
    FROM billing_view
    WHERE mess_id = $1
      AND year = $2
      AND ${sqlMonthToNumberExpression("month")}::int = $3
  `;

  const paymentsQuery = `
    WITH filtered AS (
      SELECT
        user_id,
        payment_date,
        amount,
        status,
        note,
        leave_days,
        billing_start_date,
        billing_end_date,
        updated_at,
        created_at
      FROM payment_history
      WHERE mess_id = $1
        AND (
          CASE
            WHEN month ~ '^[0-9]+$' THEN CAST(month AS INTEGER)
            ELSE EXTRACT(MONTH FROM TO_DATE(month, 'Month'))
          END
        ) = $2
        AND year = $3
    ),
    latest AS (
      SELECT DISTINCT ON (user_id)
        user_id,
        payment_date,
        status,
        note,
        leave_days,
        billing_start_date,
        billing_end_date
      FROM filtered
      ORDER BY user_id, payment_date DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ),
    totals AS (
      SELECT
        user_id,
        SUM(COALESCE(amount, 0)) AS paid_amount
      FROM filtered
      GROUP BY user_id
    )
    SELECT
      latest.user_id,
      latest.payment_date,
      totals.paid_amount AS amount,
      latest.status,
      latest.note,
      latest.leave_days,
      latest.billing_start_date,
      latest.billing_end_date
    FROM latest
    JOIN totals
      ON totals.user_id = latest.user_id
  `;

  const advanceQuery = `
    SELECT
      mess_user_id AS user_id,
      advance_amount
    FROM advance_payments
    WHERE mess_id = $1
      AND CAST(month AS INTEGER) = $2
      AND year = $3
  `;

  const monthlyAttendanceQuery = `
    SELECT
      user_id,
      days_present,
      attendance_map,
      first_attendance_date
    FROM monthly_attendance
    WHERE mess_id = $1
      AND year = $2
      AND month = $3
  `;

  const ownerMarkedQuery = `
    SELECT user_id, TO_CHAR(att_date, 'YYYY-MM-DD') AS att_date
    FROM "Owner_Marked_attendance"
    WHERE mess_id = $1
      AND att_date BETWEEN $2 AND $3
    ORDER BY user_id, att_date
  `;

  const [
    { rows: users },
    { rows: billingRows },
    { rows: paymentRows },
    { rows: advanceRows },
    { rows: monthlyAttendanceRows },
    { rows: ownerMarkedRows },
  ] = await Promise.all([
    db.query(usersQuery, [messId]),
    db.query(billingViewQuery, [messId, numericYear, numericMonth]),
    db.query(paymentsQuery, [messId, numericMonth, numericYear]),
    db.query(advanceQuery, [messId, numericMonth, numericYear]),
    db.query(monthlyAttendanceQuery, [messId, numericYear, numericMonth]),
    db.query(ownerMarkedQuery, [messId, monthStartISO, monthEndISO]),
  ]);

  const billingByUser = new Map(billingRows.map((row) => [String(row.user_id), row]));
  const paymentsByUser = new Map(paymentRows.map((row) => [String(row.user_id), row]));
  const advancesByUser = new Map(advanceRows.map((row) => [String(row.user_id), row]));
  const monthlyAttendanceByUser = new Map(
    monthlyAttendanceRows.map((row) => [String(row.user_id), row])
  );
  const ownerMarkedByUser = new Map();

  for (const row of ownerMarkedRows) {
    const userKey = String(row.user_id);
    if (!ownerMarkedByUser.has(userKey)) {
      ownerMarkedByUser.set(userKey, []);
    }

    ownerMarkedByUser.get(userKey).push(row.att_date);
  }

  return users.map((user) => {
    const userKey = String(user.user_id);
    const savedBill = billingByUser.get(userKey);
    const payment = paymentsByUser.get(userKey);
    const advance = advancesByUser.get(userKey);
    const storedAttendance = monthlyAttendanceByUser.get(userKey);

    let effectiveStart = new Date(monthStart);
    let effectiveEnd = new Date(monthEnd);

    const joinDate = toDate(user.date_of_joining);
    if (joinDate && joinDate > effectiveStart) effectiveStart = joinDate;

    if (user.status === "Frozen") {
      const freezeDate = toDate(user.freeze_date);
      if (freezeDate && freezeDate < effectiveEnd) effectiveEnd = freezeDate;
    }

    if (user.status === "Active") {
      const unfreezeDate = toDate(user.unfreeze_date);
      if (unfreezeDate && unfreezeDate > effectiveStart) effectiveStart = unfreezeDate;
    }

    const effectiveStartISO = isoDate(effectiveStart);
    const effectiveEndISO = isoDate(effectiveEnd);
    const storedAttendanceMap =
      storedAttendance?.attendance_map && typeof storedAttendance.attendance_map === "object"
        ? storedAttendance.attendance_map
        : null;
    const presentDates = Object.keys(storedAttendanceMap || {})
      .filter((dateKey) => storedAttendanceMap[dateKey] === true)
      .sort();
    const firstAttendanceISO =
      isoDate(storedAttendance?.first_attendance_date) || presentDates[0] || null;
    const billingStartISO = firstAttendanceISO || effectiveStartISO;
    const billingEndISO = effectiveEndISO;

    const combinedAttendanceMap =
      storedAttendanceMap ||
      buildMonthlyAttendanceMap({
        monthStartISO,
        monthEndISO,
        firstAttendanceISO,
        activeStartISO: effectiveStartISO,
        activeEndISO: effectiveEndISO,
        presentDates: new Set(presentDates),
      });

    const daysBilled = Number(
      savedBill?.days_billed ??
        calculateDaysBilled(combinedAttendanceMap, billingStartISO, billingEndISO)
    );

    const maxConsecutiveAbsences = getMaxConsecutiveAbsences(
      combinedAttendanceMap,
      billingStartISO,
      billingEndISO
    );

    const chosenPerDayRate = Number(savedBill?.chosen_per_day_rate ?? user.per_day_rate ?? 0);
    const totalAmount = Number((daysBilled * chosenPerDayRate).toFixed(2));
    const ownerMarkedDates = (ownerMarkedByUser.get(userKey) || []).slice().sort();

    return {
      user_id: user.user_id,
      mess_id: user.mess_id,
      name: user.name,
      email: user.email,
      status: user.status,
      mobile: user.mobile,
      parent_name: user.parent_name,
      parent_mobile: user.parent_mobile,
      course: user.course,
      hostel_name: user.hostel_name,
      room_no: user.room_no,
      year: numericYear,
      month: numericMonth,
      start_date: isoDate(payment?.billing_start_date || savedBill?.start_date || billingStartISO),
      end_date: isoDate(payment?.billing_end_date || savedBill?.end_date || billingEndISO),
      days_billed: daysBilled,
      days_present: Number(storedAttendance?.days_present ?? presentDates.length),
      chosen_per_day_rate: chosenPerDayRate,
      monthly_price: user.monthly_price || "₹0",
      total_amount: totalAmount,
      paid: payment?.status === "paid",
      paid_amount: Number(payment?.amount || 0),
      advance_amount: Number(advance?.advance_amount || 0),
      note: payment?.note || null,
      leave_days: Number(payment?.leave_days ?? user.allowed_leave_days ?? 0),
      allowed_leave_days: Number(user.allowed_leave_days || 0),
      first_attendance_date: firstAttendanceISO,
      max_consecutive_absences: maxConsecutiveAbsences,
      leave_rule_ok: maxConsecutiveAbsences <= 10,
      generated_at: null,
      attendance_map: combinedAttendanceMap,
      owner_marked_dates: ownerMarkedDates,
    };
  });
}

export { isoDate, normalizeMonthNumber };

export async function getUserMonthSourceKeys(db, messId) {
  const query = `
    WITH source_keys AS (
      SELECT
        user_id,
        year,
        ${sqlMonthToNumberExpression("month")}::int AS month
      FROM billing_view
      WHERE mess_id = $1
        AND status = 'Active'

      UNION

      SELECT
        user_id,
        year,
        ${sqlMonthToNumberExpression("month")}::int AS month
      FROM payment_history
      WHERE mess_id = $1

      UNION

      SELECT
        user_id,
        EXTRACT(YEAR FROM att_date)::int AS year,
        EXTRACT(MONTH FROM att_date)::int AS month
      FROM attendance
      WHERE mess_id = $1

      UNION

      SELECT
        user_id,
        EXTRACT(YEAR FROM att_date)::int AS year,
        EXTRACT(MONTH FROM att_date)::int AS month
      FROM "Owner_Marked_attendance"
      WHERE mess_id = $1

      UNION

      SELECT
        user_id,
        year,
        month
      FROM monthly_attendance
      WHERE mess_id = $1
    )
    SELECT DISTINCT sk.user_id, sk.year, sk.month
    FROM source_keys sk
    JOIN users u
      ON u.id = sk.user_id
      AND u.mess_id = $1
    WHERE sk.user_id IS NOT NULL
      AND sk.year IS NOT NULL
      AND sk.month IS NOT NULL
      AND COALESCE(u.status, 'Active') = 'Active'
    ORDER BY year DESC, month DESC, user_id
  `;

  const { rows } = await db.query(query, [messId]);
  return rows.map((row) => ({
    user_id: row.user_id,
    year: Number(row.year),
    month: Number(row.month),
  }));
}
