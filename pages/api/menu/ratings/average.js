import { pgPool } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    const result = await pgPool.query(`
      SELECT day_name, ROUND(AVG(rating), 2) AS avg_rating
      FROM daily_ratings
      GROUP BY day_name
      ORDER BY array_position(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], day_name)
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ratings" });
  }
}
