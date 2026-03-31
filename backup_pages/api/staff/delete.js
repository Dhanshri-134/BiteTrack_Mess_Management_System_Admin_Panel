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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    const { id } = req.body;

    await pgPool.query(
      `UPDATE staff
       SET is_active=false
       WHERE id=$1 AND mess_id=$2`,
      [id, messId]
    );

    res.json({ success: true });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}