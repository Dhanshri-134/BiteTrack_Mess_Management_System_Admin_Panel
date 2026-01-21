import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.mess_id;

    const { oldPassword, newUsername, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "Old password and new password are required",
      });
    }

    // 🔐 VERIFY OLD PASSWORD
    const check = await pgPool.query(
      `
      SELECT id
      FROM mess_owners
      WHERE mess_id = $1
        AND password = crypt($2, password)
      `,
      [messId, oldPassword]
    );

    if (check.rowCount === 0) {
      return res.status(401).json({
        ok: false,
        message: "Old password is incorrect",
      });
    }

    // 🔄 UPDATE CREDENTIALS
    const update = await pgPool.query(
      `
      UPDATE mess_owners
      SET
        username = COALESCE(NULLIF($1, ''), username),
        password = crypt($2, gen_salt('bf')),
        updated_at = NOW()
      WHERE mess_id = $3
      RETURNING id
      `,
      [newUsername, newPassword, messId]
    );

    return res.status(200).json({
      ok: true,
      message: "✅ Credentials updated successfully",
    });
  } catch (err) {
    console.error("Change credentials error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
