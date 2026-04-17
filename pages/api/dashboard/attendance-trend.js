import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

function isoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function monthLabel(year, month) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded?.messId;

    if (!messId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const recentAttendanceQuery = `
      WITH recent_records AS (
        SELECT DISTINCT user_id, att_date::date AS att_date
        FROM attendance
        WHERE mess_id = $1
          AND att_date >= CURRENT_DATE - INTERVAL '6 days'

        UNION

        SELECT DISTINCT user_id, att_date::date AS att_date
        FROM "Owner_Marked_attendance"
        WHERE mess_id = $1
          AND att_date >= CURRENT_DATE - INTERVAL '6 days'
      )
      SELECT
        rr.user_id,
        TO_CHAR(rr.att_date, 'YYYY-MM-DD') AS att_date,
        u.name AS user_name
      FROM recent_records rr
      JOIN users u
        ON u.id = rr.user_id
       AND u.mess_id = $1
      ORDER BY rr.att_date ASC, u.name ASC
    `;

    const monthlyTrendQuery = `
      SELECT
        year,
        month,
        SUM(COALESCE(days_present, 0))::int AS attendance
      FROM monthly_attendance
      WHERE mess_id = $1
        AND make_date(year, month, 1) >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `;

    const yearlyTrendQuery = `
      SELECT
        year,
        SUM(COALESCE(days_present, 0))::int AS attendance
      FROM monthly_attendance
      WHERE mess_id = $1
        AND year >= EXTRACT(YEAR FROM CURRENT_DATE)::int - 2
      GROUP BY year
      ORDER BY year ASC
    `;

    const [
      { rows: recentRecords },
      { rows: monthlyRows },
      { rows: yearlyRows },
    ] = await Promise.all([
      pgPool.query(recentAttendanceQuery, [messId]),
      pgPool.query(monthlyTrendQuery, [messId]),
      pgPool.query(yearlyTrendQuery, [messId]),
    ]);

    const todayISO = isoDate(new Date());

    const dailyTrend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dateISO = isoDate(date);

      const attendance = recentRecords.filter((row) => row.att_date === dateISO).length;

      return {
        label: new Intl.DateTimeFormat("en-IN", {
          day: "numeric",
          month: "short",
          timeZone: "Asia/Kolkata",
        }).format(date),
        rawDate: dateISO,
        attendance,
      };
    });

    const currentMonth = new Date();
    const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (5 - index), 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const matched = monthlyRows.find(
        (row) => Number(row.year) === year && Number(row.month) === month
      );

      return {
        label: monthLabel(year, month),
        rawDate: `${year}-${String(month).padStart(2, "0")}`,
        attendance: Number(matched?.attendance || 0),
      };
    });

    const currentYear = new Date().getFullYear();
    const yearlyTrend = Array.from({ length: 3 }, (_, index) => {
      const year = currentYear - (2 - index);
      const matched = yearlyRows.find((row) => Number(row.year) === year);

      return {
        label: String(year),
        attendance: Number(matched?.attendance || 0),
      };
    });

    return res.status(200).json({
      recentRecords,
      dailyTrend,
      monthlyTrend,
      yearlyTrend,
      todayPresent: dailyTrend.find((row) => row.rawDate === todayISO)?.attendance || 0,
    });
  } catch (error) {
    console.error("Attendance trend error:", error);
    return res.status(500).json({ error: "Failed to fetch attendance trend" });
  }
}
