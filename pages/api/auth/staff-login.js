import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

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
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: "JWT_SECRET is missing on server",
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required",
      });
    }

    /**
     * 1️⃣ Fetch staff + parent mess
     */
    const result = await pgPool.query(
      `
      SELECT
        s.id AS staff_id,
        s.name AS staff_name,
        s.email AS staff_email,
        s.password AS staff_password,
        s.is_active,

        m.id AS mess_id,
        m.name AS mess_name,
        m.subscription_status,
        m.trial_end_date
      FROM staffs s
      JOIN messes m ON m.id = s.mess_id
      WHERE s.email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const staff = result.rows[0];

    /**
     * 2️⃣ Staff active check
     */
    if (!staff.is_active) {
      return res.status(403).json({
        error: "Staff account disabled",
      });
    }

    /**
     * 3️⃣ Password verification
     */
    let validPassword = false;

    if (staff.staff_password?.startsWith("$2")) {
      validPassword = await bcrypt.compare(
        password,
        staff.staff_password
      );
    } else {
      validPassword = password === staff.staff_password;
    }

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    /**
     * 4️⃣ SaaS subscription guard (CRITICAL)
     */
    if (!["trial", "active"].includes(staff.subscription_status)) {
      return res.status(402).json({
        error: "Mess subscription inactive",
      });
    }

    /**
     * 5️⃣ Issue JWT (STRICT)
     */
    const token = jwt.sign(
      {
        messId: staff.mess_id,
        staffId: staff.staff_id,
        role: "STAFF",
      },
      process.env.JWT_SECRET
    );

    return res.status(200).json({
      token,
      staff: {
        id: staff.staff_id,
        name: staff.staff_name,
        email: staff.staff_email,
      },
      mess: {
        id: staff.mess_id,
        name: staff.mess_name,
        subscription_status: staff.subscription_status,
        trial_end_date: staff.trial_end_date,
      },
    });
  } catch (err) {
    console.error("STAFF LOGIN ERROR:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
}
