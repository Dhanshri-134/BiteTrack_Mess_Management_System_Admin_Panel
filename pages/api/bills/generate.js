// pages/api/bills/generate.js
import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function getMaxConsecutiveAbsences(attendanceMap, startISO = null, endISO = null) {
  if (!attendanceMap || typeof attendanceMap !== "object") return 0;
  const dates = Object.keys(attendanceMap).sort();
  let max = 0;
  let streak = 0;

  for (const d of dates) {
    if (startISO && d < startISO) continue;
    if (endISO && d > endISO) continue;

    const value = attendanceMap[d];
    const present =
      value === true ||
      value === 1 ||
      String(value).toLowerCase().startsWith("p") ||
      String(value).toLowerCase() === "present";

    if (!present) {
      streak++;
      max = Math.max(max, streak);
    } else {
      streak = 0;
    }
  }

  return max;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // --------------------------------------------
  // 🔐 STRICT JWT CHECK — NO FALLBACK
  // --------------------------------------------
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({
      error: "Unauthorized. Login again.",
      code: "NO_TOKEN",
    });

  let decoded;
  try {
    const token = auth.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({
      error: "Session expired. Please login again.",
      code: "AUTH_EXPIRED",
    });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(403).json({
      error: "Invalid session. Missing mess ID.",
      code: "INVALID_MESS",
    });
  }

  const client = await pgPool.connect();

  try {
    await client.query("SET statement_timeout = 120000");

    const { year: inputYear, month: inputMonth } = req.body;
    const now = new Date();
    const year = inputYear || now.getFullYear();
    const month = inputMonth || now.getMonth() + 1;

    // --------------------------------------------
    // ✔ FETCH USERS OF **THIS MESS ONLY**
    // --------------------------------------------
    const usersRes = await client.query(
      `SELECT id, name, mess_id, date_of_joining, status, freeze_date, unfreeze_date
       FROM users
       WHERE verified = TRUE AND mess_id = $1`,
      [messId]
    );

    // --------------------------------------------
    // ✔ LOOP THROUGH USERS — BILL GENERATION
    // --------------------------------------------
    for (const user of usersRes.rows) {
      const sub = await pgPool.connect();

      try {
        await sub.query("BEGIN");
        await sub.query("SET LOCAL statement_timeout = 120000");

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        const joinDate = user.date_of_joining ? new Date(user.date_of_joining) : null;

        let effectiveStart =
          joinDate && joinDate > monthStart ? joinDate : monthStart;

        let effectiveEnd = monthEnd;

        if (user.status === "Frozen" && user.freeze_date) {
          const freeze = new Date(user.freeze_date);
          if (freeze < effectiveEnd) effectiveEnd = freeze;
        }

        if (user.status === "Active" && user.unfreeze_date) {
          const unfreeze = new Date(user.unfreeze_date);
          if (unfreeze > effectiveStart) effectiveStart = unfreeze;
        }

        // --------------------------------------------
        // ✔ GET RATE FOR THIS MESS ONLY
        // --------------------------------------------
        const messRes = await sub.query(
          `SELECT per_day_rate FROM messes WHERE id = $1`,
          [messId]
        );
        const per_day_rate = messRes.rows[0]?.per_day_rate ?? 76.6666667;

        // --------------------------------------------
        // ✔ GET ATTENDANCE FOR THIS USER
        // --------------------------------------------
        const attRes = await sub.query(
          `SELECT att_date
           FROM attendance
           WHERE user_id = $1
             AND att_date BETWEEN $2 AND $3
           ORDER BY att_date ASC`,
          [user.id, monthStart, monthEnd]
        );

        const attendedDates = attRes.rows.map((r) => isoDate(new Date(r.att_date)));
        const firstAttendanceISO = attendedDates.length ? attendedDates[0] : null;

        const billingStartISO = firstAttendanceISO || isoDate(effectiveStart);
        const billingEndISO = isoDate(effectiveEnd);

        // Build attendance map
        const attendanceMap = {};
        let c = new Date(billingStartISO + "T00:00:00Z");
        const end = new Date(billingEndISO + "T00:00:00Z");

        while (c <= end) {
          const key = isoDate(c);
          attendanceMap[key] = attendedDates.includes(key);
          c.setUTCDate(c.getUTCDate() + 1);
        }

        // --------------------------------------------
        // BILLING LOGIC
        // --------------------------------------------
        const allDates = Object.keys(attendanceMap).sort();
        let daysBilled = 0;

        if (allDates.length > 0) {
          const firstPresent = allDates.find((d) => attendanceMap[d] === true);

          if (firstPresent) {
            let cur = new Date(firstPresent + "T00:00:00Z");
            let endDate = new Date(billingEndISO + "T00:00:00Z");

            let consecutiveAbsent = 0;
            let total = 0;
            let subtract = 0;

            while (cur <= endDate) {
              const ds = isoDate(cur);
              const present = attendanceMap[ds];

              if (!present) consecutiveAbsent++;
              else {
                if (consecutiveAbsent > 10) subtract += consecutiveAbsent;
                consecutiveAbsent = 0;
              }

              total++;
              cur.setUTCDate(cur.getUTCDate() + 1);
            }

            if (consecutiveAbsent > 10) subtract += consecutiveAbsent;

            daysBilled = Math.max(0, total - subtract);
          }
        }

        const maxConsecutiveAbsences = getMaxConsecutiveAbsences(
          attendanceMap,
          billingStartISO,
          billingEndISO
        );

        const leaveRuleOk = maxConsecutiveAbsences <= 10;
        const totalAmount = Number(daysBilled) * Number(per_day_rate);

        // --------------------------------------------
        // ✔ UPDATE monthly_attendance
        // --------------------------------------------
        await sub.query(
          `INSERT INTO monthly_attendance
             (user_id, year, month, days_present, attendance_map, first_attendance_date, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, now(), now())
           ON CONFLICT (user_id, year, month)
           DO UPDATE SET
             days_present = EXCLUDED.days_present,
             attendance_map = monthly_attendance.attendance_map || EXCLUDED.attendance_map,
             first_attendance_date =
               COALESCE(monthly_attendance.first_attendance_date, EXCLUDED.first_attendance_date),
             updated_at = now()`,
          [
            user.id,
            year,
            month,
            daysBilled,
            JSON.stringify(attendanceMap),
            firstAttendanceISO,
          ]
        );

        // --------------------------------------------
        // ✔ INSERT/UPDATE BILL
        // --------------------------------------------
        await sub.query(
          `INSERT INTO bills
             (user_id, year, month, days_billed, per_day_rate, total_amount,
              first_attendance_date, max_consecutive_absences, leave_rule_ok, generated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
           ON CONFLICT (user_id, year, month)
           DO UPDATE SET
             days_billed = EXCLUDED.days_billed,
             per_day_rate = EXCLUDED.per_day_rate,
             total_amount = EXCLUDED.total_amount,
             first_attendance_date =
               COALESCE(bills.first_attendance_date, EXCLUDED.first_attendance_date),
             max_consecutive_absences = EXCLUDED.max_consecutive_absences,
             leave_rule_ok = EXCLUDED.leave_rule_ok,
             generated_at = now()`,
          [
            user.id,
            year,
            month,
            daysBilled,
            per_day_rate,
            totalAmount,
            firstAttendanceISO,
            maxConsecutiveAbsences,
            leaveRuleOk,
          ]
        );

        await sub.query("COMMIT");
      } catch (err) {
        await sub.query("ROLLBACK");
        console.error("Billing Error (user:", user.id, "):", err);
      } finally {
        sub.release();
      }
    }

    res.json({ ok: true, message: "Bills generated for your mess." });
  } catch (err) {
    console.error("Billing error:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  } finally {
    client.release();
  }
}




// // pages/api/bills/generate.js
// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// function isoDate(d) {
//   return d.toISOString().slice(0, 10);
// }

// function getMaxConsecutiveAbsences(attendanceMap, startISO = null, endISO = null) {
//   if (!attendanceMap || typeof attendanceMap !== "object") return 0;
//   const dates = Object.keys(attendanceMap).sort();
//   let max = 0;
//   let streak = 0;
//   for (const d of dates) {
//     if (startISO && d < startISO) continue;
//     if (endISO && d > endISO) continue;

//     const val = attendanceMap[d];
//     const present =
//       val === true ||
//       val === 1 ||
//       String(val).toLowerCase().startsWith("p") ||
//       String(val).toLowerCase() === "present";

//     if (!present) {
//       streak++;
//       if (streak > max) max = streak;
//     } else {
//       streak = 0;
//     }
//   }
//   return max;
// }

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   // -------------------------
//   // 🔐 Verify Token
//   // -------------------------
//   let messId = null;
//   try {
//     const decoded = verifyToken(req);
//     messId = decoded.messId;
//   } catch (err) {
//     return res.status(401).json({
//       error: "Session expired. Please login again.",
//       code: "AUTH_EXPIRED",
//     });
//   }

//   const pool = pgPool;
//   const client = await pool.connect();

//   try {
//     await client.query("SET statement_timeout = 120000");

//     const { year: inputYear, month: inputMonth } = req.body || {};
//     const now = new Date();
//     const year = inputYear || now.getFullYear();
//     const month = inputMonth || now.getMonth() + 1;

//     // ------------------------------------
//     // ✔ Fetch only users from THIS MESS
//     // ------------------------------------
//     const usersRes = await client.query(
//       `SELECT id, name, mess_id, date_of_joining, status, freeze_date, unfreeze_date
//        FROM users
//        WHERE verified = true AND mess_id = $1`,
//       [messId]
//     );

//     for (const user of usersRes.rows) {
//       const subClient = await pool.connect();

//       try {
//         await subClient.query("BEGIN");
//         await subClient.query("SET LOCAL statement_timeout = 120000");

//         const monthStart = new Date(year, month - 1, 1);
//         const monthEnd = new Date(year, month, 0);

//         const joinDate = user.date_of_joining ? new Date(user.date_of_joining) : null;

//         let effectiveStart = joinDate && joinDate > monthStart ? joinDate : monthStart;
//         let effectiveEnd = monthEnd;

//         if (user.status === "Frozen" && user.freeze_date) {
//           const freezeDate = new Date(user.freeze_date);
//           if (freezeDate < effectiveEnd) effectiveEnd = freezeDate;
//         }

//         if (user.status === "Active" && user.unfreeze_date) {
//           const unfreezeDate = new Date(user.unfreeze_date);
//           if (unfreezeDate > effectiveStart) effectiveStart = unfreezeDate;
//         }

//         // ----------------------------------------------
//         // ✔ Fetch per-day rate ONLY from this mess
//         // ----------------------------------------------
//         const messRes = await subClient.query(
//           `SELECT per_day_rate FROM messes WHERE id = $1`,
//           [messId]
//         );
//         const per_day_rate = messRes.rows[0]?.per_day_rate ?? 76.6666667;

//         // ----------------------------------------------
//         // ✔ Attendance filtered by user_id (since user already guaranteed to be from same mess)
//         // ----------------------------------------------
//         const attRes = await subClient.query(
//           `SELECT att_date
//            FROM attendance
//            WHERE user_id = $1
//              AND att_date BETWEEN $2 AND $3
//            ORDER BY att_date ASC`,
//           [user.id, monthStart, monthEnd]
//         );

//         const attendedDates = attRes.rows.map((r) => isoDate(new Date(r.att_date)));
//         const firstAttendanceISO = attendedDates.length > 0 ? attendedDates[0] : null;

//         const billingStartISO = firstAttendanceISO || isoDate(effectiveStart);
//         const billingEndISO = isoDate(effectiveEnd);

//         // Build attendance map
//         const attendanceMap = {};
//         let curr = new Date(billingStartISO + "T00:00:00.000Z");
//         const lastDay = new Date(billingEndISO + "T00:00:00.000Z");

//         while (curr <= lastDay) {
//           const key = isoDate(curr);
//           attendanceMap[key] = attendedDates.includes(key);
//           curr.setUTCDate(curr.getUTCDate() + 1);
//         }

//         // -------------------------------
//         // Billing logic
//         // -------------------------------
//         const allDates = Object.keys(attendanceMap).sort();
//         let daysBilled = 0;

//         if (allDates.length > 0) {
//           const firstPresent = allDates.find((d) => attendanceMap[d] === true);
//           if (firstPresent) {
//             let cur = new Date(firstPresent + "T00:00:00Z");
//             let end = new Date(billingEndISO + "T00:00:00Z");

//             let absRun = 0;
//             let totalDays = 0;
//             let subtractAbsent = 0;

//             while (cur <= end) {
//               const ds = isoDate(cur);
//               const present = !!attendanceMap[ds];

//               if (!present) absRun++;
//               else {
//                 if (absRun > 10) subtractAbsent += absRun;
//                 absRun = 0;
//               }

//               totalDays++;
//               cur.setUTCDate(cur.getUTCDate() + 1);
//             }

//             if (absRun > 10) subtractAbsent += absRun;

//             daysBilled = Math.max(0, totalDays - subtractAbsent);
//           }
//         }

//         const maxConsecutiveAbsences = getMaxConsecutiveAbsences(
//           attendanceMap,
//           billingStartISO,
//           billingEndISO
//         );
//         const leaveRuleOk = maxConsecutiveAbsences <= 10;
//         const totalAmount = Number(daysBilled) * Number(per_day_rate);

//         // ----------------------------------------------
//         // ✔ Update monthly attendance
//         // ----------------------------------------------
//         await subClient.query(
//           `INSERT INTO monthly_attendance (user_id, year, month, days_present, attendance_map, first_attendance_date, created_at, updated_at)
//            VALUES ($1, $2, $3, $4, $5::jsonb, $6, now(), now())
//            ON CONFLICT (user_id, year, month)
//            DO UPDATE SET
//              days_present = EXCLUDED.days_present,
//              attendance_map = monthly_attendance.attendance_map || EXCLUDED.attendance_map,
//              first_attendance_date = COALESCE(monthly_attendance.first_attendance_date, EXCLUDED.first_attendance_date),
//              updated_at = now()`,
//           [
//             user.id,
//             year,
//             month,
//             daysBilled,
//             JSON.stringify(attendanceMap),
//             firstAttendanceISO,
//           ]
//         );

//         // ----------------------------------------------
//         // ✔ Insert / update bills
//         // ----------------------------------------------
//         await subClient.query(
//           `INSERT INTO bills (user_id, year, month, days_billed, per_day_rate, total_amount, first_attendance_date, max_consecutive_absences, leave_rule_ok, generated_at)
//            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
//            ON CONFLICT (user_id, year, month)
//            DO UPDATE SET
//              days_billed = EXCLUDED.days_billed,
//              per_day_rate = EXCLUDED.per_day_rate,
//              total_amount = EXCLUDED.total_amount,
//              first_attendance_date = COALESCE(bills.first_attendance_date, EXCLUDED.first_attendance_date),
//              max_consecutive_absences = EXCLUDED.max_consecutive_absences,
//              leave_rule_ok = EXCLUDED.leave_rule_ok,
//              generated_at = now()`,
//           [
//             user.id,
//             year,
//             month,
//             daysBilled,
//             per_day_rate,
//             totalAmount,
//             firstAttendanceISO,
//             maxConsecutiveAbsences,
//             leaveRuleOk,
//           ]
//         );

//         await subClient.query("COMMIT");
//       } catch (uErr) {
//         await subClient.query("ROLLBACK");
//         console.error(`Error processing user ${user.id}:`, uErr);
//       } finally {
//         subClient.release();
//       }
//     }

//     res.json({ ok: true, message: "Bills generated for your mess users" });
//   } catch (err) {
//     console.error("Billing error:", err);
//     res.status(500).json({ error: "Internal server error", details: err.message });
//   } finally {
//     client.release();
//   }
// }
