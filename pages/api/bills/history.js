import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {


  // CORS (safe)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    console.log("🟡 OPTIONS preflight hit");
    return res.status(200).end();
  }

 try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    /* ============================
       USERS WITH PAID PAYMENTS ONLY
    ============================ */
    if (!req.query.user_id) {
      const { rows } = await pgPool.query(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          (
            SELECT jsonb_build_object(
              'payment_date', to_char(ph.payment_date, 'YYYY-MM-DD'),
              'amount', ph.amount,
              'payment_type', ph.payment_type,
              'payment_method', ph.payment_method,
              'transaction_id', ph.transaction_id,
              'billing_start_date', ph.billing_start_date,
              'billing_end_date', ph.billing_end_date
            )
            FROM payment_history ph
            WHERE ph.user_id = u.id
              AND ph.mess_id = $1
              AND ph.status = 'paid'
            ORDER BY ph.payment_date DESC, ph.id DESC
            LIMIT 1
          ) AS latest_payment
        FROM users u
        WHERE u.mess_id = $1
          AND EXISTS (
            SELECT 1
            FROM payment_history ph
            WHERE ph.user_id = u.id
              AND ph.mess_id = $1
              AND ph.status = 'paid'
          )
        ORDER BY u.name;
        `,
        [messId]
      );

      return res.json({ users: rows });
    }

    /* ============================
       FULL HISTORY FOR ONE USER
    ============================ */
    const { user_id } = req.query;

    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        to_char(payment_date, 'YYYY-MM-DD') AS payment_date,
        amount,
        payment_type,
        payment_method,
        transaction_id,
        billing_start_date,
        billing_end_date,
        leave_days,
        note
      FROM payment_history
      WHERE mess_id = $1
        AND user_id = $2
        AND status = 'paid'
      ORDER BY payment_date DESC, id DESC
      `,
      [messId, user_id]
    );

    return res.json({ history: rows });

  }  catch (err) {
    console.error("🔥 Payment history ERROR:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
}
