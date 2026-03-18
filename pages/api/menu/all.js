import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";

export default async function handler(req, res) {

  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    // 🔐 AUTH
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Month and year required" });
    }

    // 📥 GET WEEKLY MENU
    const { rows } = await pgPool.query(
      `
      SELECT day_of_week, meal_type, items
      FROM menu
      WHERE mess_id = $1
      `,
      [messId]
    );

    // 🔁 CREATE MAP
    const menuMap = {};
    rows.forEach(r => {
      if (!menuMap[r.day_of_week]) {
        menuMap[r.day_of_week] = {};
      }
      menuMap[r.day_of_week][r.meal_type] = r.items;
    });

    // 📅 GENERATE MONTH
    const days = [];
    const date = new Date(year, month - 1, 1);

    while (date.getMonth() === Number(month) - 1) {

      const dayName = date.toLocaleDateString("en-US", {
        weekday: "long"
      });

      const meals = menuMap[dayName] || {};

      days.push({
        date: new Date(date),
        day: dayName,
        meals: {
          breakfast: meals.breakfast || [],
          lunch: meals.lunch || [],
          dinner: meals.dinner || []
        }
      });

      date.setDate(date.getDate() + 1);
    }

    return res.status(200).json({
      month,
      year,
      days
    });

  } catch (err) {
    console.error("🔥 menu monthly error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}