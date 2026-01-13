import { pgPool } from "../../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      messName,
      email,
      password,
      location,
      perDayRate,
    } = req.body;

    if (!messName || !email || !password) {
      return res.status(400).json({
        error: "Mess name, email and password are required",
      });
    }

    // 1️⃣ Check if mess already exists
    const existing = await pgPool.query(
      "SELECT id FROM messes WHERE email = $1",
      [email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "Mess already registered with this email",
      });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Trial dates
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

    // 4️⃣ Insert mess
    const result = await pgPool.query(
      `
      INSERT INTO messes (
        name,
        email,
        password,
        location,
        per_day_rate,
        trial_start_date,
        trial_end_date,
        subscription_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'trial')
      RETURNING id, name, email, subscription_status, trial_end_date
      `,
      [
        messName,
        email,
        hashedPassword,
        location || null,
        perDayRate || 1.0,
        trialStart,
        trialEnd,
      ]
    );

    const mess = result.rows[0];

    // 5️⃣ JWT (admin)
    const token = jwt.sign(
      {
        messId: mess.id,
        role: "MESS_ADMIN",
      },
      process.env.JWT_SECRET
    );

    return res.status(201).json({
      token,
      mess,
    });
  } catch (err) {
    console.error("REGISTER API ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
