import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";

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

    const { month, year } = req.query;

    const { rows } = await pgPool.query(
      `
      SELECT 
        menu_date,
        meal_type,
        items
      FROM menu_daily
      WHERE mess_id = $1
        AND EXTRACT(MONTH FROM menu_date) = $2
        AND EXTRACT(YEAR FROM menu_date) = $3
      ORDER BY menu_date
      `,
      [messId, month, year]
    );

    // group by date
    const map = {};

    rows.forEach(r => {
      const date = r.menu_date.toISOString().slice(0,10);

      if (!map[date]) {
        map[date] = {
          date,
          meals: {
            breakfast: [],
            lunch: [],
            dinner: []
          }
        };
      }

      map[date].meals[r.meal_type] = r.items;
    });

    return res.json({
      days: Object.values(map)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}