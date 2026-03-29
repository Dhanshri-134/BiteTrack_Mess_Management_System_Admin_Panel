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

    const existingStock = await pgPool.query(
      `SELECT id, total_stock, is_active
       FROM inventory_stock
       WHERE mess_id=$1
         AND item_id=$2
       LIMIT 1`,
      [messId, itemId]
    );

    let result;

    if (existingStock.rowCount > 0) {
      result = await pgPool.query(
        `UPDATE inventory_stock
         SET min_stock=$1
         WHERE mess_id=$2
           AND item_id=$3
         RETURNING mess_id, item_id, total_stock, min_stock, is_active`,
        [minStock, messId, itemId]
      );
    } else {
      result = await pgPool.query(
        `INSERT INTO inventory_stock (mess_id, item_id, total_stock, min_stock, is_active)
         VALUES ($1, $2, 0, $3, TRUE)
         RETURNING mess_id, item_id, total_stock, min_stock, is_active`,
        [messId, itemId, minStock]
      );
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
}
