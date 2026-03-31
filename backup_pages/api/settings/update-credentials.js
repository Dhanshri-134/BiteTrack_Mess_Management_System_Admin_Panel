import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { oldPassword, newPassword, newEmail } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "Old password and new password are required",
      });
    }

    const verify = await pgPool.query(
      `
      SELECT id
      FROM staffs
      WHERE mess_id = $1
        AND password = crypt($2, password)
      `,
      [messId, oldPassword]
    );

    if (verify.rowCount === 0) {
      return res.status(401).json({
        ok: false,
        message: "Old password is incorrect",
      });
    }

    await pgPool.query(
      `
      UPDATE staffs
      SET
        email = COALESCE(NULLIF($1, ''), email),
        password = crypt($2, gen_salt('bf')),
        updated_at = NOW()
      WHERE mess_id = $3
      `,
      [newEmail || "", newPassword, messId]
    );

    return res.status(200).json({
      ok: true,
      message: "Credentials updated successfully",
    });
  } catch (err) {
    console.error("❌ change-credentials error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
