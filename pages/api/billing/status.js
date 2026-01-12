import { requireAuth } from "../../../lib/requireAuth";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    const result = await pgPool.query(
      `
      SELECT
        subscription_status,
        trial_start_date,
        trial_end_date,
        subscription_plan,
        next_billing_date
      FROM messes
      WHERE id = $1
      `,
      [user.messId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mess not found" });
    }

    const mess = result.rows[0];

    let daysRemaining = null;
    if (mess.trial_end_date) {
      const today = new Date();
      const end = new Date(mess.trial_end_date);
      const diff = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysRemaining = diff >= 0 ? diff : 0;
    }

    res.json({
      subscription_status: mess.subscription_status,
      trial_end_date: mess.trial_end_date,
      days_remaining: daysRemaining,
      subscription_plan: mess.subscription_plan,
      next_billing_date: mess.next_billing_date,
    });
  } catch (err) {
    console.error("BILLING STATUS ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
