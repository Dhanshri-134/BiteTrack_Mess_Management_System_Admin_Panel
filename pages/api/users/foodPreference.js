
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  // ---------------------------------------------------
  // 🔐 Require JWT token
  // ---------------------------------------------------
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error("Invalid token:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  // ---------------------------------------------------
  // 📊 Fetch food preference counts ONLY for this mess
  // ---------------------------------------------------
  try {
  const { rows } = await pgPool.query(
    `
    SELECT id, name, phone, food_preference
    FROM users
    WHERE food_preference IN ('veg', 'nonveg') AND  verified = true
      AND mess_id = $1
    `,
    [messId]
  );

  const data = {
    veg: 0,
    nonveg: 0,
    users: [],
  };

  rows.forEach((r) => {
    if (r.food_preference === "veg") data.veg += 1;
    if (r.food_preference === "nonveg") data.nonveg += 1;

    data.users.push({
      id: r.id,
      name: r.name,
      phone: r.phone,
      food_preference: r.food_preference,
    });
  });

  res.status(200).json(data);
} catch (err) {
  console.error("Error fetching food type stats:", err);
  res.status(500).json({ error: "Internal Server Error" });
}
}
