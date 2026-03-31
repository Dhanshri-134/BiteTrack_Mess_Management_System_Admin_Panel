import { useLanguage } from "../../../context/LanguageContext";
import { pgPool } from "../../../lib/db";
import bcrypt from "bcryptjs";

function generatePassword() {
  // simple but strong enough for temp use
  return (
    Math.random().toString(36).slice(-6) +
    Math.random().toString(36).slice(-4).toUpperCase()
  );
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const client = await pgPool.connect();

  try {
    // 1️⃣ Check mess exists
    const messRes = await client.query(
      `SELECT id FROM messes WHERE email = $1`,
      [email]
    );

    if (messRes.rows.length === 0) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const messId = messRes.rows[0].id;

    // 2️⃣ Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3️⃣ Update password
    await client.query(
      `UPDATE messes SET password = $1 WHERE id = $2`,
      [hashedPassword, messId]
    );

    // 4️⃣ Send email (Brevo)
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM },
        to: [{ email }],
        subject: "Your BiteTrack Login Credentials",
        htmlContent: `
          <p>{t("yourBiteTrackPasswordHasBeenReset")}</p>

          <p><b>{t("email")}</b> ${email}</p>
          <p><b>{t("newPassword")}</b> ${newPassword}</p>

          <p>
            Please log in using this password.
            For security reasons, change your password after login.
          </p>
        `,
      }),
    });

    if (!resp.ok) {
      const data = await resp.json();
      throw new Error("Brevo error: " + JSON.stringify(data));
    }

    return res.json({
      ok: true,
      message: "New password sent to your email",
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
