import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "DELETE") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

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
  } catch (err) {
    console.error("❌ delete staff error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal server error",
    });
  }
}
