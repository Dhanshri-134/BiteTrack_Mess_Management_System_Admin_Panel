// pages/api/bills/update-attendance.js
import { getPgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pool = await getPgPool();

  try {
    await pool.query("BEGIN");

    // get previous day as date (no time)
    const { rows: pd } = await pool.query("SELECT (CURRENT_DATE - INTERVAL '1 day')::date AS prev_day");
    const prevDay = pd[0].prev_day;

    const sql = `
      WITH p AS (
        SELECT user_id, COUNT(*) AS add_days
        FROM attendance
        WHERE att_date = $1
        GROUP BY user_id
      )
      UPDATE bills b
      SET
        days_billed = b.days_billed + p.add_days,
        per_day_rate = CASE WHEN (b.days_billed + p.add_days) > 15 THEN 76 ELSE 90 END,
        total_amount = (b.days_billed + p.add_days) * CASE WHEN (b.days_billed + p.add_days) > 15 THEN 76 ELSE 90 END,
        generated_at = NOW()
      FROM p
      WHERE b.user_id = p.user_id
        AND b.year = EXTRACT(YEAR FROM $1)::int
        AND b.month = EXTRACT(MONTH FROM $1)::int;

      INSERT INTO bills (user_id, year, month, days_billed, per_day_rate, total_amount, generated_at)
      SELECT
        p.user_id,
        EXTRACT(YEAR FROM $1)::int AS year,
        EXTRACT(MONTH FROM $1)::int AS month,
        p.add_days AS days_billed,
        CASE WHEN p.add_days > 15 THEN 76 ELSE 90 END AS per_day_rate,
        p.add_days * CASE WHEN p.add_days > 15 THEN 76 ELSE 90 END AS total_amount,
        NOW() AS generated_at
      FROM p
      LEFT JOIN bills b
        ON b.user_id = p.user_id
        AND b.year = EXTRACT(YEAR FROM $1)::int
        AND b.month = EXTRACT(MONTH FROM $1)::int
      WHERE b.id IS NULL;

      DELETE FROM attendance WHERE att_date = $1;
    `;

    await pool.query(sql, [prevDay]);

    await pool.query("COMMIT");
    res.status(200).json({ message: "Previous day processed, bills updated and attendance deleted.", processed_day: prevDay });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error updating attendance:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
