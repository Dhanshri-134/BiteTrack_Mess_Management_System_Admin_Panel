import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const itemId = Number(req.body?.item_id);
    const minStock = Number(req.body?.min_stock ?? 0);

    if (!itemId || Number.isNaN(minStock) || minStock < 0) {
      return res
        .status(400)
        .json({ success: false, error: "Valid item and min stock required" });
    }

    const result = await pgPool.query(
      `
      INSERT INTO inventory_stock (mess_id, item_id, total_stock, min_stock, is_active)
      VALUES ($1, $2, 0, $3, TRUE)
      ON CONFLICT (mess_id, item_id)
      DO UPDATE SET min_stock = EXCLUDED.min_stock
      RETURNING mess_id, item_id, total_stock, min_stock, is_active
      `,
      [messId, itemId, minStock]
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
