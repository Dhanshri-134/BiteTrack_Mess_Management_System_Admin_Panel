import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;
    if (!messId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { rows } = await pgPool.query(
      `
      SELECT subscription_status, trial_end_date
      FROM messes
      WHERE id = $1
      `,
      [messId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Mess not found" });
    }

    const mess = rows[0];

    if (!["trial", "active"].includes(mess.subscription_status)) {
      return res.status(402).json({
        expired: true,
        subscription_status: mess.subscription_status,
        trial_end_date: mess.trial_end_date,
      });
    }

    return res.status(200).json({
      expired: false,
      subscription_status: mess.subscription_status,
      trial_end_date: mess.trial_end_date,
    });
  } catch (err) {
    console.error("SUBSCRIPTION CHECK ERROR:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}
