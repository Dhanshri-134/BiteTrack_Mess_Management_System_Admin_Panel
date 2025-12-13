// import { pgPool } from "../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   const { year, month } = req.body;
//   if (!year || !month) return res.status(400).json({ error: "year and month required" });

//   const client = await pgPool.connect();
//   try {
//     await client.query("BEGIN");

//     // 1. Get all users
//     const usersRes = await client.query(`SELECT id, name, mess_id FROM users WHERE verified=true`);

//     for (let user of usersRes.rows) {
//       // 2. Get per day rate
//       const messRes = await client.query(`SELECT per_day_rate FROM messes WHERE id=$1`, [user.mess_id]);
//       const per_day_rate = messRes.rows[0]?.per_day_rate || 1;

//       // 3. Get attendance for the month
//       const attRes = await client.query(
//         `SELECT att_date
//          FROM attendance
//          WHERE user_id=$1
//            AND att_date >= $2
//            AND att_date <= $3
//          ORDER BY att_date ASC`,
//         [
//           user.id,
//           `${year}-${month.toString().padStart(2, "0")}-01`,
//           `${year}-${month.toString().padStart(2, "0")}-31`,
//         ]
//       );

//       const dates = attRes.rows.map(r => new Date(r.att_date));
//       let daysBilled = 0;
//       let consecutiveAbsent = 0;
//       let lastDate = null;

//       // Count days billed, skip if >10 consecutive absences
//       for (let d of dates) {
//         if (lastDate) {
//           const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
//           if (diff > 1) {
//             consecutiveAbsent += diff - 1;
//           } else {
//             consecutiveAbsent = 0;
//           }
//         }
//         lastDate = d;
//         if (consecutiveAbsent <= 10) daysBilled++;
//       }

//       const totalAmount = daysBilled * per_day_rate;

//       // Insert/Update bill
//       await client.query(
//         `INSERT INTO bills (user_id, year, month, days_billed, per_day_rate, total_amount)
//          VALUES ($1, $2, $3, $4, $5, $6)
//          ON CONFLICT (user_id, year, month)
//          DO UPDATE SET days_billed=$4, total_amount=$6, per_day_rate=$5`,
//         [user.id, year, month, daysBilled, per_day_rate, totalAmount]
//       );
//     }

//     await client.query("COMMIT");
//     res.json({ ok: true, message: "Monthly bills generated successfully" });
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   } finally {
//     client.release();
//   }
// }





import { pgPool } from "../../lib/db";
import { verifyToken } from "../../lib/auth"; // adjust path if needed

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { year, month } = req.body;
  if (!year || !month)
    return res.status(400).json({ error: "year and month required" });

  // --------------------------
  // 🔐 Extract mess_id from token (Optional)
  // --------------------------
  let messId = null;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);

      if (decoded?.mess_id) messId = decoded.mess_id;
    }
  } catch (e) {
    console.log("Token invalid → fallback to old behavior");
  }

  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // --------------------------------------
    // 1️⃣ GET USERS → Token-based filtering
    // --------------------------------------
    let usersQuery = `
      SELECT id, name, mess_id 
      FROM users 
      WHERE verified = true
    `;

    let params = [];

    if (messId) {
      usersQuery += ` AND mess_id = $1`;
      params = [messId];
    }

    const usersRes = await client.query(usersQuery, params);

    // --------------------------------------
    // 2️⃣ Loop all users and generate bills
    // --------------------------------------
    for (let user of usersRes.rows) {
      // Fetch mess rate
      const messRes = await client.query(
        `SELECT per_day_rate 
         FROM messes 
         WHERE id = $1`,
        [user.mess_id]
      );
      const per_day_rate = messRes.rows[0]?.per_day_rate || 1;

      // Attendance range
      const monthStart = `${year}-${month.toString().padStart(2, "0")}-01`;
      const monthEnd = `${year}-${month.toString().padStart(2, "0")}-31`;

      const attRes = await client.query(
        `SELECT att_date
         FROM attendance
         WHERE user_id = $1
           AND att_date >= $2
           AND att_date <= $3
         ORDER BY att_date ASC`,
        [user.id, monthStart, monthEnd]
      );

      const dates = attRes.rows.map((r) => new Date(r.att_date));

      let daysBilled = 0;
      let consecutiveAbsent = 0;
      let lastDate = null;

      // Billing rules
      for (let d of dates) {
        if (lastDate) {
          const diff = (d - lastDate) / (1000 * 60 * 60 * 24);
          if (diff > 1) {
            consecutiveAbsent += diff - 1;
          } else {
            consecutiveAbsent = 0;
          }
        }
        lastDate = d;

        if (consecutiveAbsent <= 10) daysBilled++;
      }

      const totalAmount = daysBilled * per_day_rate;

      // Insert or update bill
      await client.query(
        `INSERT INTO bills 
         (user_id, year, month, days_billed, per_day_rate, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, year, month)
         DO UPDATE SET 
           days_billed = $4, 
           total_amount = $6,
           per_day_rate = $5`,
        [user.id, year, month, daysBilled, per_day_rate, totalAmount]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, message: "Monthly bills generated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
