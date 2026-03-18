import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { type = "daily" } = req.query;

    let query = "";

    // ✅ DAILY (7 DAYS - IST FIXED)
    if (type === "daily") {
      query = `
        SELECT 
          DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS label,
          SUM(amount) AS total
        FROM payment_history
        WHERE mess_id = $1
          AND status = 'paid'
          AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(created_at AT TIME ZONE 'Asia/Kolkata')
        ORDER BY DATE(created_at AT TIME ZONE 'Asia/Kolkata');
      `;
    }

    // ✅ WEEKLY
 else if (type === "weekly") {
  query = `
    SELECT 
      TO_CHAR(week_start, 'DD Mon') || ' - ' || TO_CHAR(week_start + INTERVAL '6 days', 'DD Mon') AS label,
      week_start AS raw_date,
      SUM(amount) AS total
    FROM (
      SELECT 
        DATE_TRUNC('week', (created_at AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day') - INTERVAL '1 day' AS week_start,
        amount
      FROM payment_history
      WHERE mess_id = $1
        AND status = 'paid'
        AND created_at >= NOW() - INTERVAL '35 days'
    ) t
    GROUP BY week_start
    ORDER BY week_start;
  `;
}

    // ✅ MONTHLY
    else if (type === "monthly") {
      query = `
        SELECT 
          TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') AS label,
          SUM(amount) AS total
        FROM payment_history
        WHERE mess_id = $1
          AND status = 'paid'
          AND created_at >= CURRENT_DATE - INTERVAL '6 years'
        GROUP BY label
        ORDER BY label;
      `;
    }

    const result = await pgPool.query(query, [messId]);

    // ✅ PAYMENT METHODS
    const methodStats = await pgPool.query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total
      FROM payment_history
      WHERE mess_id = $1 AND status = 'paid'
      GROUP BY payment_method;
    `, [messId]);

    // ✅ TOTAL
    const total = await pgPool.query(`
      SELECT SUM(amount) as total
      FROM payment_history
      WHERE mess_id = $1 AND status = 'paid';
    `, [messId]);

    res.status(200).json({
      chart: result.rows,
      methods: methodStats.rows,
      total: total.rows[0]?.total || 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}