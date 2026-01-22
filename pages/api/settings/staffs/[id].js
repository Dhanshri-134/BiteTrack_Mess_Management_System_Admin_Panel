import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
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
    const { id } = req.query;

    // ======================================================
    // 🟡 PUT — update staff credentials (OWNER ACTION)
    // ======================================================
    if (req.method === "PUT") {
      const { newEmail, newPassword } = req.body;

      if (!newEmail && !newPassword) {
        return res.status(400).json({
          ok: false,
          message: "Nothing to update",
        });
      }

      const updates = [];
      const values = [];
      let idx = 1;

      if (newEmail) {
        updates.push(`email = $${idx++}`);
        values.push(newEmail);
      }

      if (newPassword) {
        updates.push(`password = crypt($${idx++}, gen_salt('bf'))`);
        values.push(newPassword);
      }

      await pgPool.query(
        `
        UPDATE staffs
        SET ${updates.join(", ")},
            updated_at = NOW()
        WHERE id = $${idx} AND mess_id = $${idx + 1}
        `,
        [...values, id, messId]
      );

      return res.status(200).json({
        ok: true,
        message: "Staff credentials updated",
      });
    }

    // ======================================================
    // 🔴 DELETE — remove staff
    // ======================================================
    if (req.method === "DELETE") {
      const result = await pgPool.query(
        `
        DELETE FROM staffs
        WHERE id = $1 AND mess_id = $2
        `,
        [id, messId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          ok: false,
          message: "Staff not found",
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Staff deleted successfully",
      });
    }

    return res.status(405).json({
      ok: false,
      message: "Method not allowed",
    });
  } catch (err) {
    console.error("❌ staff [id] API error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
