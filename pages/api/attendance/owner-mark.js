import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    // ✅ STRICT JWT VERIFY
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;   // 🔴 ONLY FROM TOKEN

    if (!messId) {
      return res.status(403).json({ message: "Invalid mess access" });
    }

    const { user_id, att_date } = req.body;

    if (!user_id || !att_date) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // ✅ Insert into Owner_Marked_attendance
    await pgPool.query(
      `
      INSERT INTO "Owner_Marked_attendance"
      (user_id, mess_id, att_date)
      VALUES ($1, $2, $3)
      `,
      [user_id, messId, att_date]
    );

    return res.status(200).json({ message: "Attendance marked successfully" });

  } catch (err) {
    console.error("Owner mark attendance error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
