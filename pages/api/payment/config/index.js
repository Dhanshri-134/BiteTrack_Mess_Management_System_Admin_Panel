import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // 🔐 STRICT JWT REQUIRED
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;
    if (!messId) {
      return res.status(401).json({ error: "messId missing in token" });
    }

    // ===============================
    // 🟢 GET CONFIG
    // ===============================
    if (req.method === "GET") {
      const result = await pgPool.query(
        `
        SELECT upi_id, receiver_name
        FROM payment_config
        WHERE mess_id = $1
        ORDER BY id DESC
        LIMIT 1
        `,
        [messId]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({
          upi_id: "",
          receiver_name: "",
        });
      }

      return res.status(200).json(result.rows[0]);
    }

    // ===============================
    // 🔵 UPSERT CONFIG
    // ===============================
    if (req.method === "POST") {
      const { upi_id, receiver_name } = req.body;

      const existing = await pgPool.query(
        `
        SELECT id FROM payment_config
        WHERE mess_id = $1
        LIMIT 1
        `,
        [messId]
      );

      if (existing.rows.length > 0) {
        // UPDATE
        await pgPool.query(
          `
          UPDATE payment_config
          SET upi_id = $1,
              receiver_name = $2,
              is_active = TRUE,
              updated_at = NOW()
          WHERE mess_id = $3
          `,
          [upi_id, receiver_name, messId]
        );
      } else {
        // INSERT
        await pgPool.query(
          `
          INSERT INTO payment_config (mess_id, upi_id, receiver_name, is_active)
          VALUES ($1, $2, $3, TRUE)
          `,
          [messId, upi_id, receiver_name]
        );
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("Payment Config API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
