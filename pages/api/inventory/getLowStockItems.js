import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const result = await pgPool.query(
      `SELECT
        i.id,
        i.item_name,
        i.unit,
        COALESCE(s.total_stock, 0) AS current_stock,
        COALESCE(s.min_stock, 0) AS min_stock,
        c.category_name
      FROM inventory_stock s
      JOIN inventory_items i
        ON i.id=s.item_id
      LEFT JOIN inventory_categories c
        ON c.id=i.category_id
      WHERE s.mess_id=$1
      AND s.is_active IS NOT FALSE
      AND COALESCE(s.total_stock, 0) <= COALESCE(s.min_stock, 0)
      ORDER BY i.item_name`,
      [messId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
