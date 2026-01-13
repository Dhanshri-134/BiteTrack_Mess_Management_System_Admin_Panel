import Razorpay from "razorpay";
import { requireAuth } from "../../../lib/requireAuth";
import { pgPool } from "../../../lib/db";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1️⃣ Fetch mess
    const messResult = await pgPool.query(
      `
      SELECT
        name,
        email,
        razorpay_customer_id,
        trial_end_date
      FROM messes
      WHERE id = $1
      `,
      [user.messId]
    );

    const mess = messResult.rows[0];

    // 2️⃣ Create Razorpay customer if not exists
    let customerId = mess.razorpay_customer_id;

    if (!customerId) {
      const customer = await razorpay.customers.create({
        name: mess.name,
        email: mess.email,
      });

      customerId = customer.id;

      await pgPool.query(
        `
        UPDATE messes
        SET razorpay_customer_id = $1
        WHERE id = $2
        `,
        [customerId, user.messId]
      );
    }

    // 3️⃣ Create subscription (starts after trial)
    const startAt = Math.floor(
      new Date(mess.trial_end_date).getTime() / 1000
    );

    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID,
      customer_id: customerId,
      start_at: startAt,
      customer_notify: 1,
    });

    // 4️⃣ Save subscription
    await pgPool.query(
      `
      UPDATE messes
      SET
        razorpay_subscription_id = $1,
        subscription_plan = 'monthly'
      WHERE id = $2
      `,
      [subscription.id, user.messId]
    );

    res.json({
      subscription_id: subscription.id,
    });
  } catch (err) {
    console.error("SUBSCRIPTION CREATE ERROR:", err);
    res.status(500).json({ error: "Subscription creation failed" });
  }
}
