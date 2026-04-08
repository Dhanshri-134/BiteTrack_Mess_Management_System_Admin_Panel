function toIsoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function shiftIsoDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function maxIsoDate(...values) {
  return values.filter(Boolean).sort().at(-1) || null;
}

function getMonthBounds(year, month) {
  return {
    monthStartIso: toIsoDate(new Date(Date.UTC(year, month - 1, 1))),
    monthEndIso: toIsoDate(new Date(Date.UTC(year, month, 0))),
  };
}

export async function syncMonthlyAttendanceForMonth(client, { userId, messId, year, month }) {
  const numericYear = Number(year);
  const numericMonth = Number(month);

  const userRes = await client.query(
    `SELECT date_of_joining, status, freeze_date, unfreeze_date
     FROM users
     WHERE id = $1 AND mess_id = $2
     LIMIT 1`,
    [userId, messId]
  );

  if (userRes.rows.length === 0) {
    return { ok: false, reason: "user_not_found" };
  }

  const user = userRes.rows[0];
  const { monthStartIso, monthEndIso } = getMonthBounds(numericYear, numericMonth);

  const attendanceRes = await client.query(
    `
    SELECT DISTINCT att_date::date AS att_date
    FROM (
      SELECT att_date
      FROM attendance
      WHERE user_id = $1
        AND mess_id = $2
        AND EXTRACT(YEAR FROM att_date) = $3
        AND EXTRACT(MONTH FROM att_date) = $4

      UNION ALL

      SELECT att_date
      FROM "Owner_Marked_attendance"
      WHERE user_id = $1
        AND mess_id = $2
        AND EXTRACT(YEAR FROM att_date) = $3
        AND EXTRACT(MONTH FROM att_date) = $4
    ) AS attendance_union
    ORDER BY att_date
    `,
    [userId, messId, numericYear, numericMonth]
  );

  const presentDates = attendanceRes.rows.map((row) => toIsoDate(row.att_date));

  if (presentDates.length === 0) {
    return { ok: true, deleted: false, skipped: true };
  }

  const presentDateSet = new Set(presentDates);
  const firstAttendanceDate = presentDates[0];

  const normalizedStatus = String(user.status || "Active").toLowerCase();

  const activeStart = maxIsoDate(
    monthStartIso,
    user.date_of_joining ? toIsoDate(user.date_of_joining) : null,
    user.unfreeze_date ? toIsoDate(user.unfreeze_date) : null
  );

  let activeEnd = monthEndIso;
  if (normalizedStatus === "inactive" && user.freeze_date) {
    const freezeIso = toIsoDate(user.freeze_date);
    if (freezeIso <= monthEndIso) {
      activeEnd = shiftIsoDate(freezeIso, -1);
    }
  }

  const todayIso = toIsoDate(new Date());
  const attendanceMap = {};
  let cursor = monthStartIso;

  while (cursor <= monthEndIso) {
    if (cursor > todayIso) {
      attendanceMap[cursor] = null;
    } else if (cursor < firstAttendanceDate) {
      attendanceMap[cursor] = null;
    } else if (cursor < activeStart || cursor > activeEnd) {
      attendanceMap[cursor] = null;
    } else {
      attendanceMap[cursor] = presentDateSet.has(cursor);
    }

    cursor = shiftIsoDate(cursor, 1);
  }

  await client.query(
    `
    INSERT INTO monthly_attendance
      (user_id, year, month, days_present, attendance_map, first_attendance_date, mess_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, now(), now())
    ON CONFLICT (user_id, year, month)
    DO UPDATE SET
      days_present = EXCLUDED.days_present,
      attendance_map = EXCLUDED.attendance_map,
      first_attendance_date = EXCLUDED.first_attendance_date,
      mess_id = EXCLUDED.mess_id,
      updated_at = now()
    `,
    [
      userId,
      numericYear,
      numericMonth,
      presentDates.length,
      JSON.stringify(attendanceMap),
      firstAttendanceDate,
      messId,
    ]
  );

  return {
    ok: true,
    deleted: false,
    firstAttendanceDate,
    daysPresent: presentDates.length,
    attendanceMap,
  };
}

export async function syncMonthlyAttendanceForDate(client, { userId, messId, attDate }) {
  const date = new Date(`${attDate}T00:00:00.000Z`);
  return syncMonthlyAttendanceForMonth(client, {
    userId,
    messId,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  });
}

export async function syncMonthlyAttendanceForMessMonth(
  client,
  { messId, year, month, userIds = null }
) {
  const numericMessId = Number(messId);
  const numericYear = Number(year);
  const numericMonth = Number(month);

  let usersRes;

  if (Array.isArray(userIds) && userIds.length > 0) {
    usersRes = await client.query(
      `
      SELECT id
      FROM users
      WHERE mess_id = $1
        AND verified = TRUE
        AND id = ANY($2::int[])
      ORDER BY id ASC
      `,
      [numericMessId, userIds]
    );
  } else {
    usersRes = await client.query(
      `
      SELECT id
      FROM users
      WHERE mess_id = $1
        AND verified = TRUE
      ORDER BY id ASC
      `,
      [numericMessId]
    );
  }

  const failed = [];
  let syncedCount = 0;
  let deletedCount = 0;

  for (const row of usersRes.rows) {
    try {
      const result = await syncMonthlyAttendanceForMonth(client, {
        userId: row.id,
        messId: numericMessId,
        year: numericYear,
        month: numericMonth,
      });

      syncedCount += 1;
      if (result?.deleted) {
        deletedCount += 1;
      }
    } catch (error) {
      failed.push({
        userId: row.id,
        message: error.message,
      });
    }
  }

  return {
    ok: failed.length === 0,
    totalUsers: usersRes.rows.length,
    syncedCount,
    deletedCount,
    failed,
  };
}
