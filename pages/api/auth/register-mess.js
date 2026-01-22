import { pgPool } from "@/lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      name,
      email,
      password,
      per_day_rate,
      location,
      open_time,
      allowed_leave_days,
      monthly_price,
    } = req.body;

    if (!name || !email || !password || !per_day_rate) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    const existing = await pgPool.query(
      `SELECT id FROM messes WHERE email = $1`,
      [email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pgPool.query(
      `
      INSERT INTO messes (
        name,
        email,
        password,
        per_day_rate,
        location,
        open_time,
        allowed_leave_days,
        monthly_price,
        subscription_status,
        force_password_change
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        'pending_approval',
        true
      )
      `,
      [
        name,
        email,
        hashedPassword,
        per_day_rate,
        location || null,
        open_time || null,
        allowed_leave_days || null,
        monthly_price || "₹0",
      ]
    );

    return res.status(201).json({
      ok: true,
      message: "Registration submitted. Awaiting admin approval.",
    });
  } catch (err) {
    console.error("❌ register-mess error:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
