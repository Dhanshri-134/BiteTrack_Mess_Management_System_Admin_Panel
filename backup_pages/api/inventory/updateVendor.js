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
    const { vendor_id, vendor_name, phone, email, address, gst_number, notes } =
      req.body || {};

    if (!vendor_id || !vendor_name?.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Vendor id and name required" });
    }

    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res
        .status(400)
        .json({ success: false, error: "Valid email required" });
    }

    const duplicate = await pgPool.query(
      `SELECT id
       FROM inventory_vendors
       WHERE mess_id=$1
       AND id<>$2
       AND LOWER(vendor_name)=LOWER($3)
       LIMIT 1`,
      [messId, vendor_id, vendor_name.trim()]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Another vendor already uses this name",
      });
    }

    const result = await pgPool.query(
      `UPDATE inventory_vendors
       SET vendor_name=$3,
           phone=$4,
           email=$5,
           address=$6,
           gst_number=$7,
           notes=$8,
           updated_at=NOW()
       WHERE mess_id=$1
       AND id=$2
       RETURNING id, vendor_name, phone, email, address, gst_number, notes`,
      [
        messId,
        vendor_id,
        vendor_name.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        gst_number?.trim() || null,
        notes?.trim() || null,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
