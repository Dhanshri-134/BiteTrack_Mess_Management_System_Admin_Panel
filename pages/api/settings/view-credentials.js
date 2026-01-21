import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 🔐 TOKEN REQUIRED
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // IMPORTANT: use SAME key everywhere
    const messId = decoded.messId || decoded.mess_id;
    if (!messId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // ✅ FETCH EMAIL ONLY
    const { rows } = await pgPool.query(
      `SELECT email FROM messes WHERE id = $1`,
      [messId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Mess not found" });
    }

    // ⚠️ Password is NEVER readable from DB
    // Return placeholder only
    return res.status(200).json({
      ok: true,
      username: rows[0].email,
      password: "••••••••", // intentionally masked
    });
  } catch (err) {
    console.error("❌ View credentials error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
