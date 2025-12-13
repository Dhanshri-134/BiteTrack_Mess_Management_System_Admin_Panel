// pages/api/users/inactive.js
import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    // -------------------------------------------------------
    // 1️⃣ Validate REQUIRED JWT token
    // -------------------------------------------------------
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.messId) {
      return res.status(401).json({ ok: false, message: "Invalid token" });
    }

    const messId = decoded.messId;

    // -------------------------------------------------------
    // 2️⃣ Fetch ONLY inactive users of that mess
    // -------------------------------------------------------
    const query = `
      SELECT 
        id,
        name,
        email,
        phone,
        hostel_name,
        room_no,
        course,
        date_of_joining,
        created_at,
        status
      FROM users
      WHERE mess_id = $1
        AND status = 'Inactive'
      ORDER BY created_at DESC
    `;

    const { rows } = await pgPool.query(query, [messId]);

    return res.status(200).json({
      ok: true,
      data: rows,
    });

  } catch (err) {
    console.error("Error fetching inactive users:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
