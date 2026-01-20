import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      message: "Email and password are required.",
    });
  }

  // ======================================================
  // 🔐 JWT — MANDATORY (NO FALLBACK)
  // ======================================================
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }

  if (!decoded?.messId) {
    return res.status(401).json({ ok: false, message: "Invalid token payload" });
  }

  const messId = decoded.messId;

  // ======================================================
  // 🟢 UPDATE OWNER CREDENTIALS
  // ======================================================
  try {
    const query = `
      UPDATE mess_owners
      SET
        email = $1,
        password = crypt($2, gen_salt('bf')),
        mail_sent = false,
        verified = false,
        updated_at = NOW()
      WHERE mess_id = $3
      RETURNING id;
    `;

    const result = await pgPool.query(query, [email, password, messId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        message: "Owner not found",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Change request submitted successfully.",
    });
  } catch (err) {
    console.error("❌ Error updating credentials:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
