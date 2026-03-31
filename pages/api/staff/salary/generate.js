import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { seedManualSalaryRows } from "@/lib/staffSalary";

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
    if (!token) {
      return res.status(401).json({ error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;

    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        error: "Month and year required"
      });
    }

    const salaries = await seedManualSalaryRows({ messId, month, year });

    res.json({
      success: true,
      generated: salaries.length
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Server error" });

  }
}
