import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 🔐 AUTH
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let messId;
  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    messId = decoded.messId;
    if (!messId) throw new Error();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    // =========================
    // GET
    // =========================
    if (req.method === "GET") {
      const { rows } = await pgPool.query(
        `SELECT contact_name, phone_number, email, address
         FROM mess_contact
         WHERE mess_id = $1`,
        [messId]
      );

      return res.status(200).json(rows[0] || {});
    }

    // =========================
    // POST
    // =========================
    if (req.method === "POST") {
      const { contact_name, phone_number, email, address } = req.body;

      if (!contact_name || !phone_number || !email || !address) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await pgPool.query(
        `
        INSERT INTO mess_contact
          (mess_id, contact_name, phone_number, email, address)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (mess_id)
        DO UPDATE SET
          contact_name = EXCLUDED.contact_name,
          phone_number = EXCLUDED.phone_number,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          updated_at = NOW()
        `,
        [messId, contact_name, phone_number, email, address]
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("🔥 mess-contact error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
