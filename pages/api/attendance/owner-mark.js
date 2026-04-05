import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";
import { syncMonthlyAttendanceForDate } from "@/lib/monthlyAttendanceSync";

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

  const client = await pgPool.connect();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    if (!messId) {
      return res.status(403).json({ message: "Invalid mess access" });
    }

    const { user_id, att_date } = req.body;

    if (!user_id || !att_date) {
      return res.status(400).json({ message: "Missing fields" });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO "Owner_Marked_attendance"
      (user_id, mess_id, att_date)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, mess_id, att_date)
      DO NOTHING
      RETURNING id
      `,
      [user_id, messId, att_date]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Attendance already marked",
      });
    }

    await syncMonthlyAttendanceForDate(client, {
      userId: user_id,
      messId,
      attDate: att_date,
    });

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Attendance marked successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("OWNER MARK ERROR:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
}
