import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    // 🔐 AUTH
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.mess_id;

    const { reason } = req.body;

    // 📧 Get email snapshot
    const { rows } = await pgPool.query(
      "SELECT email FROM messes WHERE id = $1",
      [messId]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        message: "Mess not found",
      });
    }

    const email = rows[0].email;

    // 🚫 Prevent duplicate pending request
    const existing = await pgPool.query(
      `
      SELECT id FROM account_deletion_requests
      WHERE mess_id = $1 AND status = 'pending'
      `,
      [messId]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({
        ok: false,
        message: "Deletion request already submitted",
      });
    }

    // 🧾 Insert request
    await pgPool.query(
      `
      INSERT INTO account_deletion_requests (mess_id, email, reason)
      VALUES ($1, $2, $3)
      `,
      [messId, email, reason || null]
    );

    return res.status(200).json({
      ok: true,
      message: "Account deletion request submitted successfully",
    });
  } catch (err) {
    console.error("❌ delete-account-request error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
