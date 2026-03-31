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
    const { vendor_name, phone, email, address, gst_number, notes } = req.body || {};

    const cleanName = vendor_name?.trim();
    const cleanEmail = email?.trim() || null;

    if (!cleanName) {
      return res
        .status(400)
        .json({ success: false, error: "Vendor name required" });
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res
        .status(400)
        .json({ success: false, error: "Valid email required" });
    }

    const existing = await pgPool.query(
      `SELECT id
       FROM inventory_vendors
       WHERE mess_id=$1
       AND LOWER(vendor_name)=LOWER($2)
       LIMIT 1`,
      [messId, cleanName]
    );

    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ success: false, error: "Vendor already exists" });
    }

    const result = await pgPool.query(
      `INSERT INTO inventory_vendors
      (mess_id, vendor_name, phone, email, address, gst_number, notes)
      VALUES($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, vendor_name, phone, email, address, gst_number, notes`,
      [
        messId,
        cleanName,
        phone?.trim() || null,
        cleanEmail,
        address?.trim() || null,
        gst_number?.trim() || null,
        notes?.trim() || null,
      ]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
