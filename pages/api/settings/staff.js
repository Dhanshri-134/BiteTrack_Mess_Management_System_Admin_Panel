import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // 🔐 JWT verify
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.messId) {
      return res.status(401).json({ ok: false, message: "Invalid token" });
    }

    const messId = decoded.messId;

    // ======================================================
    // 🔵 GET — list staff
    // ======================================================
    if (req.method === "GET") {
      const { rows } = await pgPool.query(
        `
        SELECT id, name, email, role, is_active, created_at
        FROM staffs
        WHERE mess_id = $1
        ORDER BY created_at ASC
        `,
        [messId]
      );

      return res.status(200).json({ ok: true, data: rows });
    }

    // ======================================================
    // 🟢 POST — add staff
    // ======================================================
    if (req.method === "POST") {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          ok: false,
          message: "Name, email and password are required",
        });
      }

      // Check duplicate email
      const exists = await pgPool.query(
        `SELECT id FROM staffs WHERE email = $1 LIMIT 1`,
        [email]
      );

      if (exists.rowCount > 0) {
        return res.status(409).json({
          ok: false,
          message: "Email already exists",
        });
      }

      await pgPool.query(
        `
        INSERT INTO staffs (mess_id, name, email, password, role)
        VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), $5)
        `,
        [messId, name, email, password, role || "STAFF"]
      );

      return res.status(201).json({
        ok: true,
        message: "Staff added successfully",
      });
    }

    return res.status(405).json({ ok: false, message: "Method not allowed" });
  } catch (err) {
    console.error("❌ staffs API error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
