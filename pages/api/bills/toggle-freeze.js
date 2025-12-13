// import jwt from "jsonwebtoken";
// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "PATCH")
//     return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const auth = req.headers.authorization;
//     if (!auth) return res.status(401).json({ error: "Unauthorized" });

//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const messId = decoded.messId;

//     const { user_id } = req.body;

//     const userQuery = await pgPool.query(
//       `SELECT status FROM users WHERE id = $1 AND mess_id = $2`,
//       [user_id, messId]
//     );

//     if (!userQuery.rows.length)
//       return res.status(404).json({ error: "User not found" });

//     const currentStatus = userQuery.rows[0].status;

//     if (currentStatus === "Active") {
//       // Freeze user
//       await pgPool.query(
//         `UPDATE users SET status='Inactive', freeze_date = NOW() WHERE id=$1`,
//         [user_id]
//       );
//       return res.status(200).json({ message: "User frozen (Inactive)" });
//     } else {
//       // Unfreeze → reset first attendance
//       await pgPool.query(
//         `UPDATE users 
//          SET status='Active', freeze_date=NULL, first_attendance_date = NOW() 
//          WHERE id=$1`,
//         [user_id]
//       );
//       return res.status(200).json({ message: "User activated (Active)" });
//     }

//   } catch (err) {
//     console.error("FREEZE ERROR:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// }



// pages/api/users/toggle-freeze.js
import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db"; // adjust path if needed

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  function todayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset
  const istTime = new Date(now.getTime() + istOffset);

  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istTime.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded?.messId;
    if (!messId) return res.status(401).json({ error: "Invalid token: messId missing" });

    const { userId, action, month, year } = req.body;
    if (!userId || !action) return res.status(400).json({ error: "userId and action are required" });

    // normalize month/year: if provided use them, else null
    const billMonth = month ? Number(month) : null;
    const billYear = year ? Number(year) : null;

    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      // ensure user belongs to mess
      const userQ = "SELECT id, status, mess_id FROM users WHERE id = $1";
      const { rows: userRows } = await client.query(userQ, [userId]);
      if (userRows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "User not found" });
      }
      if (userRows[0].mess_id !== messId) {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Forbidden: user not in your mess" });
      }

      // determine relevant paid-record: either provided month/year OR the most recent paid payment_history entry
      let paidCheckQ = `
        SELECT month, year, payment_date, status
        FROM payment_history
        WHERE user_id = $1 AND mess_id = $2 AND status = 'paid'
      `;
      const paidParams = [userId, messId];
      if (billMonth && billYear) {
        paidCheckQ += " AND month = $3 AND year = $4";
        paidParams.push(String(billMonth), billYear);
      }
      paidCheckQ += " ORDER BY payment_date DESC LIMIT 1";

      const { rows: paidRows } = await client.query(paidCheckQ, paidParams);

      const hasPaid = paidRows.length > 0;

      if (action === "freeze") {
        if (!hasPaid) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Cannot freeze: payment for billing period not found/paid" });
        }

        // mark user frozen
        const updUserQ = `
          UPDATE users
          SET status = 'Inactive', freeze_date = CURRENT_DATE, updated_at = now()
          WHERE id = $1
          RETURNING id, name, email, status, freeze_date, unfreeze_date
        `;
        const { rows: updUserRows } = await client.query(updUserQ, [userId]);
        const updatedUser = updUserRows[0];

        // compute freeze year/month from today's date
        const nowDate = new Date();
        const freezeYear = nowDate.getFullYear();
        const freezeMonth = nowDate.getMonth() + 1;
        // const freezeDateText = nowDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
const freezeDateText = todayIST();
        // Update attendance_map for monthly_attendance rows for this user for freezeMonth and later:
        // For each attendance_map JSONB, set values to null for keys that are full-date strings >= freezeDate.
        const updateAttendanceQ = `
          UPDATE monthly_attendance ma
SET attendance_map = (
  SELECT jsonb_object_agg(
    k,
    CASE
      WHEN (k ~ '^\d{4}-\d{2}-\d{2}$') AND k >= $4
        THEN 'null'::jsonb
      ELSE v
    END
  )
  FROM jsonb_each(coalesce(ma.attendance_map, '{}'::jsonb)) AS t(k,v)
),
updated_at = now()
WHERE ma.user_id = $1
  AND ma.mess_id = $2
  AND (ma.year > $3 OR (ma.year = $3 AND ma.month >= $5))
  AND coalesce(ma.attendance_map, '{}'::jsonb) <> '{}'::jsonb;

        `;
        // params: userId, messId, freezeYear, freezeDateText, freezeMonth
        await client.query(updateAttendanceQ, [userId, messId, freezeYear, freezeDateText, freezeMonth]);

        await client.query("COMMIT");
        return res.status(200).json({ ok: true, action: "freeze", user: updatedUser });

      } else if (action === "unfreeze") {
        // unfreeze: set status Active, set unfreeze_date, and set first_attendance_date for current month to current_date
        const updUserQ = `
          UPDATE users
          SET status = 'Active', unfreeze_date = CURRENT_DATE, updated_at = now()
          WHERE id = $1
          RETURNING id, name, email, status, freeze_date, unfreeze_date
        `;
        const { rows: updUserRows } = await client.query(updUserQ, [userId]);
        const updatedUser = updUserRows[0];

        // upsert monthly_attendance for current month/year: set first_attendance_date = current_date
        const nowDate = new Date();
        const curYear = nowDate.getFullYear();
        const curMonth = nowDate.getMonth() + 1;
        const curDateText = nowDate.toISOString().slice(0, 10);

        const upsertMA = `
          INSERT INTO monthly_attendance (user_id, year, month, first_attendance_date, mess_id, attendance_map, days_present, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT attendance_map FROM monthly_attendance WHERE user_id=$1 AND year=$2 AND month=$3), '{}'::jsonb), COALESCE((SELECT days_present FROM monthly_attendance WHERE user_id=$1 AND year=$2 AND month=$3), 0), now(), now())
          ON CONFLICT (user_id, year, month)
          DO UPDATE SET first_attendance_date = EXCLUDED.first_attendance_date, updated_at = now()
        `;
        await client.query(upsertMA, [userId, curYear, curMonth, curDateText, messId]);

        await client.query("COMMIT");
        return res.status(200).json({ ok: true, action: "unfreeze", user: updatedUser });
      } else {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Unknown action. Use 'freeze' or 'unfreeze'." });
      }
    } catch (innerErr) {
      await client.query("ROLLBACK");
      console.error("toggle-freeze inner error:", innerErr);
      return res.status(500).json({ error: innerErr.message || "Internal error" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("toggle-freeze error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
