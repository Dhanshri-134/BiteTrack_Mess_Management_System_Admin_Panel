import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";

export default async function handler(req, res) {
     res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', "GET, POST, DELETE, OPTIONS");
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "DELETE") {
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
      return res.status(400).json({
        message: "user_id and att_date required",
      });
    }

    const deleteResult = await client.query(
      `
      DELETE FROM public."Owner_Marked_attendance"
      WHERE user_id = $1
      AND mess_id = $2
      AND att_date = $3
      RETURNING id
      `,
      [user_id, messId, att_date]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(403).json({
        message: "No owner attendance found to delete",
      });
    }

    return res.status(200).json({
      message: "Owner attendance deleted successfully",
    });

  } catch (error) {
    console.error("OWNER DELETE ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
}
