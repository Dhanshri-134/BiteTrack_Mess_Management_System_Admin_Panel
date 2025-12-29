import { pgPool } from "../../../lib/db";

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
    // ✅ CHECK MESS (NOT USERS)
    const messRes = await client.query(
      `SELECT id FROM messes WHERE email = $1`,
      [email]
    );

    if (messRes.rows.length === 0) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const messId = messRes.rows[0].id;

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await client.query(
      `INSERT INTO password_resets (mess_id, code, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [messId, code]
    );

    // ✅ SEND EMAIL (Brevo)
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
        subject: "BiteTrack Password Reset",
        htmlContent: `
          <p>Your password reset code is:</p>
          <h2>${code}</h2>
          <p>This code expires in 15 minutes.</p>
        `,
      }),
    });

    if (!resp.ok) {
      const data = await resp.json();
      throw new Error("Brevo error: " + JSON.stringify(data));
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
