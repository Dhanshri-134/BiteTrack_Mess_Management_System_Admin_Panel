import { pgPool } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { day, rating } = req.body;
  try {
    await pgPool.query(
      "INSERT INTO daily_ratings (day_name, rating) VALUES ($1, $2)",
      [day, rating]
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add rating" });
  }
}
