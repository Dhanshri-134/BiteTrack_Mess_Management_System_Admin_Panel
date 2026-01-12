import jwt from "jsonwebtoken";
import { pgPool } from "./db";

/**
 * SaaS Auth Middleware
 * - Validates JWT
 * - Extracts messId from token ONLY
 * - Enforces subscription (trial / active)
 */
export async function requireAuth(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: "Authorization token missing" });
      return null;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Invalid authorization format" });
      return null;
    }

    // 1️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.messId) {
      res.status(401).json({ error: "Invalid token payload" });
      return null;
    }

    const messId = decoded.messId;

    // 2️⃣ Check subscription status from DB (source of truth)
    const result = await pgPool.query(
      `
      SELECT
        subscription_status,
        trial_end_date
      FROM messes
      WHERE id = $1
      `,
      [messId]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ error: "Mess not found" });
      return null;
    }

    const mess = result.rows[0];

    // 3️⃣ Subscription guard
    if (!["trial", "active"].includes(mess.subscription_status)) {
      res.status(402).json({
        error: "Subscription inactive. Please renew to continue.",
      });
      return null;
    }

    // 4️⃣ Attach user context (DO NOT TRUST CLIENT)
    req.user = {
      messId,
      role: decoded.role || "MESS_ADMIN",
    };

    return req.user;
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}
