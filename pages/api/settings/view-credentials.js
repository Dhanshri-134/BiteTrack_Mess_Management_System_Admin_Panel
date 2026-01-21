import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.mess_id;

    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password required" });

    const { rows } = await pgPool.query(
      "SELECT email, password FROM messes WHERE mess_id = $1",
      [messId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Owner not found" });

    const isValid = await bcrypt.compare(password, rows[0].password);
    if (!isValid)
      return res.status(401).json({ message: "Invalid password" });

    return res.status(200).json({
      ok: true,
      username: rows[0].email,
      password, // returning entered password intentionally
    });
  } catch (err) {
    console.error("View credentials error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
