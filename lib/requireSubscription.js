import jwt from "jsonwebtoken";
import { pgPool } from "./db";

/**
 * Verifies JWT + subscription status
 * Attaches mess info to req.mess
 */
export async function requireSubscription(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(401).json({ error: "Invalid token payload" });
  }

  // 🔑 Fetch subscription status
  const { rows } = await pgPool.query(
    `
    SELECT
      id,
      name,
      subscription_status,
      trial_end_date
    FROM messes
    WHERE id = $1
    `,
    [messId]
  );

  if (!rows.length) {
    return res.status(401).json({ error: "Mess not found" });
  }

  const mess = rows[0];

  // 🚨 GLOBAL SUBSCRIPTION BLOCK
  if (!["trial", "active"].includes(mess.subscription_status)) {
    return res.status(402).json({
      error: "SUBSCRIPTION_EXPIRED",
      subscription_status: mess.subscription_status,
      trial_end_date: mess.trial_end_date,
    });
  }

  // Attach to request (VERY IMPORTANT)
  req.mess = mess;

  return true;
}
