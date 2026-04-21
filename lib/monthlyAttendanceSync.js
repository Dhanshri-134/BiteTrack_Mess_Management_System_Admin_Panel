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

function isFrozenStatus(status) {
  const normalized = String(status || "Active").trim().toLowerCase();
  return normalized === "inactive" || normalized === "frozen";
}

function buildSeedAttendanceMap({
  monthStartIso,
  monthEndIso,
  todayIso,
  activeStart,
  activeEnd,
}) {
  const attendanceMap = {};
  let cursor = monthStartIso;

  while (cursor <= monthEndIso) {
    if (cursor > todayIso) {
      attendanceMap[cursor] = null;
    } else if (!activeStart || !activeEnd || cursor < activeStart || cursor > activeEnd) {
      attendanceMap[cursor] = null;
    } else {
      attendanceMap[cursor] = false;
    }

    cursor = shiftIsoDate(cursor, 1);
  }

  return attendanceMap;
}

async function getMonthlySeedContext(client, { userId, messId, year, month }) {
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
    return null;
  }

  const user = userRes.rows[0];
  const { monthStartIso, monthEndIso } = getMonthBounds(numericYear, numericMonth);
  const todayIso = toIsoDate(new Date());
  const activeStart = maxIsoDate(
    monthStartIso,
    user.date_of_joining ? toIsoDate(user.date_of_joining) : null,
    user.unfreeze_date ? toIsoDate(user.unfreeze_date) : null
  );

  let activeEnd = monthEndIso;
  if (isFrozenStatus(user.status) && user.freeze_date) {
    const freezeIso = toIsoDate(user.freeze_date);
    if (freezeIso <= monthEndIso) {
      activeEnd = shiftIsoDate(freezeIso, -1);
    }
  }

  if (activeStart && activeEnd && activeStart > activeEnd) {
    activeEnd = null;
  }

  return {
    user,
    numericYear,
    numericMonth,
    monthStartIso,
    monthEndIso,
    todayIso,
    activeStart,
    activeEnd,
    seedMap: buildSeedAttendanceMap({
      monthStartIso,
      monthEndIso,
      todayIso,
      activeStart,
      activeEnd,
    }),
  };
}

async function ensureMonthlyAttendanceSeeded(client, { userId, messId, year, month }) {
  const context = await getMonthlySeedContext(client, { userId, messId, year, month });
  if (!context) {
    return null;
  }

  const {
    numericYear,
    numericMonth,
    seedMap,
  } = context;

  await client.query(
    `
    INSERT INTO monthly_attendance
      (user_id, year, month, days_present, attendance_map, first_attendance_date, mess_id, created_at, updated_at)
    VALUES ($1, $2, $3, 0, $4::jsonb, NULL, $5, now(), now())
    ON CONFLICT (user_id, year, month)
    DO UPDATE SET
      attendance_map = EXCLUDED.attendance_map || COALESCE(monthly_attendance.attendance_map, '{}'::jsonb),
      mess_id = EXCLUDED.mess_id,
      updated_at = now()
    `,
    [userId, numericYear, numericMonth, JSON.stringify(seedMap), messId]
  );

  return context;
}

async function getVerifiedMessUsers(client, { messId, userIds = null }) {
  const numericMessId = Number(messId);

  if (Array.isArray(userIds) && userIds.length > 0) {
    return client.query(
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
  }

  return client.query(
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

async function setMonthlyAttendanceDateValue(
  client,
  { userId, messId, attDate, present }
) {
  const attDateIso = toIsoDate(`${attDate}T00:00:00.000Z`);
  const date = new Date(`${attDateIso}T00:00:00.000Z`);
  const context = await ensureMonthlyAttendanceSeeded(client, {
    userId,
    messId,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  });

  if (!context) {
    return { ok: false, reason: "user_not_found" };
  }

  let valueLiteral = "null";
  if (
    context.activeStart &&
    context.activeEnd &&
    attDateIso >= context.activeStart &&
    attDateIso <= context.activeEnd &&
    attDateIso <= context.todayIso
  ) {
    valueLiteral = present ? "true" : "false";
  }

  const { rows } = await client.query(
    `
    WITH updated_map AS (
      SELECT jsonb_set(
        COALESCE(attendance_map, '{}'::jsonb),
        ARRAY[$5],
        CASE $6
          WHEN 'true' THEN 'true'::jsonb
          WHEN 'false' THEN 'false'::jsonb
          ELSE 'null'::jsonb
        END,
        true
      ) AS attendance_map
      FROM monthly_attendance
      WHERE user_id = $1
        AND mess_id = $2
        AND year = $3
        AND month = $4
      FOR UPDATE
    ),
    stats AS (
      SELECT
        COUNT(*) FILTER (WHERE entry.value = 'true'::jsonb) AS days_present,
        MIN(entry.key::date) FILTER (
          WHERE entry.value = 'true'::jsonb
            AND entry.key ~ '^\\d{4}-\\d{2}-\\d{2}$'
        ) AS first_attendance_date
      FROM updated_map um
      CROSS JOIN LATERAL jsonb_each(um.attendance_map) AS entry(key, value)
    )
    UPDATE monthly_attendance ma
    SET
      attendance_map = um.attendance_map,
      days_present = COALESCE(stats.days_present, 0),
      first_attendance_date = stats.first_attendance_date,
      updated_at = now()
    FROM updated_map um, stats
    WHERE ma.user_id = $1
      AND ma.mess_id = $2
      AND ma.year = $3
      AND ma.month = $4
    RETURNING ma.days_present, ma.first_attendance_date, ma.attendance_map
    `,
    [
      userId,
      messId,
      context.numericYear,
      context.numericMonth,
      attDateIso,
      valueLiteral,
    ]
  );

  return {
    ok: true,
    deleted: false,
    daysPresent: Number(rows[0]?.days_present || 0),
    firstAttendanceDate: rows[0]?.first_attendance_date
      ? toIsoDate(rows[0].first_attendance_date)
      : null,
    attendanceMap: rows[0]?.attendance_map || context.seedMap,
  };
}

export async function syncMonthlyAttendanceForMonth(client, { userId, messId, year, month }) {
  const context = await ensureMonthlyAttendanceSeeded(client, { userId, messId, year, month });
  if (!context) {
    return { ok: false, reason: "user_not_found" };
  }

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
    [userId, messId, context.numericYear, context.numericMonth]
  );

  let lastResult = {
    ok: true,
    deleted: false,
    daysPresent: 0,
    firstAttendanceDate: null,
    attendanceMap: context.seedMap,
  };

  for (const row of attendanceRes.rows) {
    lastResult = await setMonthlyAttendanceDateValue(client, {
      userId,
      messId,
      attDate: row.att_date,
      present: true,
    });
  }

  return lastResult;
}

export async function syncMonthlyAttendanceForDate(client, { userId, messId, attDate }) {
  const sourceRes = await client.query(
    `
    SELECT EXISTS (
      SELECT 1
      FROM (
        SELECT 1
        FROM attendance
        WHERE user_id = $1
          AND mess_id = $2
          AND att_date = $3

        UNION ALL

        SELECT 1
        FROM "Owner_Marked_attendance"
        WHERE user_id = $1
          AND mess_id = $2
          AND att_date = $3
      ) AS sources
    ) AS present
    `,
    [userId, messId, attDate]
  );

  return setMonthlyAttendanceDateValue(client, {
    userId,
    messId,
    attDate,
    present: Boolean(sourceRes.rows[0]?.present),
  });
}

export async function initializeMonthlyAttendanceForMessMonth(
  client,
  { messId, year, month, userIds = null }
) {
  const numericMessId = Number(messId);
  const numericYear = Number(year);
  const numericMonth = Number(month);

  const usersRes = await getVerifiedMessUsers(client, {
    messId: numericMessId,
    userIds,
  });

  const failed = [];
  let initializedCount = 0;

  for (const row of usersRes.rows) {
    try {
      const context = await ensureMonthlyAttendanceSeeded(client, {
        userId: row.id,
        messId: numericMessId,
        year: numericYear,
        month: numericMonth,
      });

      if (context) {
        initializedCount += 1;
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
    initializedCount,
    failed,
  };
}

export async function syncMonthlyAttendanceForMessMonth(
  client,
  { messId, year, month, userIds = null }
) {
  const numericMessId = Number(messId);
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const usersRes = await getVerifiedMessUsers(client, {
    messId: numericMessId,
    userIds,
  });

  const failed = [];
  let syncedCount = 0;

  for (const row of usersRes.rows) {
    try {
      await syncMonthlyAttendanceForMonth(client, {
        userId: row.id,
        messId: numericMessId,
        year: numericYear,
        month: numericMonth,
      });
      syncedCount += 1;
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
    deletedCount: 0,
    failed,
  };
}
