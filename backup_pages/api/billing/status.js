import { requireAuth } from "../../../lib/requireAuth";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

    if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const result = await pgPool.query(
      `
      SELECT
  subscription_plan,
  trial_start_date,
  trial_end_date,
  subscription_start_date,
  subscription_end_date,
  CASE
    WHEN subscription_plan IS NOT NULL
         AND subscription_end_date >= CURRENT_DATE
      THEN 'active'
    WHEN subscription_plan IS NOT NULL
         AND subscription_end_date < CURRENT_DATE
      THEN 'expired'
    WHEN subscription_plan IS NULL
         AND trial_end_date >= CURRENT_DATE
      THEN 'trial'
    ELSE 'expired'
  END AS computed_status
FROM messes
WHERE id = $1;
      `,
      [user.messId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mess not found" });
    }

    const mess = result.rows[0];

    let daysRemaining = null;

const today = new Date();

if (mess.computed_status === "trial" && mess.trial_end_date) {
  const end = new Date(mess.trial_end_date);
  const diff = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  daysRemaining = diff >= 0 ? diff : 0;
}

if (mess.computed_status === "active" && mess.subscription_end_date) {
  const end = new Date(mess.subscription_end_date);
  const diff = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  daysRemaining = diff >= 0 ? diff : 0;
}

    res.json({
      subscription_status: mess.computed_status,
      trial_end_date: mess.trial_end_date,
      subscription_end_date: mess.subscription_end_date,
      days_remaining: daysRemaining,
      subscription_plan: mess.subscription_plan,
    });
  } catch (err) {
    console.error("BILLING STATUS ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
