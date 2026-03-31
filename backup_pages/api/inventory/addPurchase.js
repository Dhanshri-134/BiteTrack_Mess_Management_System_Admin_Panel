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
    const {
      vendor_id,
      invoice_number,
      purchase_date,
      notes,
      items = [],
    } = req.body || {};

    if (!vendor_id) {
      return res.status(400).json({ success: false, error: "Vendor required" });
    }

    const normalizedItems = items
      .map((item) => ({
        item_id: Number(item.item_id),
        quantity: Number(item.quantity),
        price: Number(item.price),
      }))
      .filter((item) => item.item_id && item.quantity > 0 && item.price >= 0);

    if (normalizedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one valid item is required",
      });
    }

    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");

      const total = normalizedItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0
      );

      const purchase = await client.query(
        `INSERT INTO inventory_purchases
        (mess_id,vendor_id,invoice_number,purchase_date,total_amount,notes)
        VALUES($1,$2,$3,$4,$5,$6)
        RETURNING id`,
        [
          messId,
          vendor_id,
          invoice_number?.trim() || null,
          purchase_date || new Date().toISOString().slice(0, 10),
          total,
          notes?.trim() || null,
        ]
      );

      const purchaseId = purchase.rows[0].id;

      for (const item of normalizedItems) {
        await client.query(
          `INSERT INTO inventory_purchase_items
          (purchase_id,item_id,quantity,unit_price,total_price)
          VALUES($1,$2,$3,$4,$5)`,
          [
            purchaseId,
            item.item_id,
            item.quantity,
            item.price,
            item.quantity * item.price,
          ]
        );

        const stockRow = await client.query(
          `SELECT id
           FROM inventory_stock
           WHERE mess_id=$1
             AND item_id=$2
           LIMIT 1`,
          [messId, item.item_id]
        );

        if (stockRow.rowCount > 0) {
          await client.query(
            `UPDATE inventory_stock
             SET total_stock = COALESCE(total_stock, 0) + $1,
                 is_active = TRUE
             WHERE mess_id=$2
               AND item_id=$3`,
            [item.quantity, messId, item.item_id]
          );
        } else {
          await client.query(
            `INSERT INTO inventory_stock
             (mess_id, item_id, total_stock, min_stock, is_active)
             VALUES($1, $2, $3, 0, TRUE)`,
            [messId, item.item_id, item.quantity]
          );
        }

        await client.query(
          `INSERT INTO inventory_stock_transactions
          (mess_id,item_id,transaction_type,quantity,reference_id,reference_type,notes)
          VALUES($1,$2,'purchase',$3,$4,'purchase',$5)`,
          [
            messId,
            item.item_id,
            item.quantity,
            purchaseId,
            notes?.trim() || null,
          ]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
