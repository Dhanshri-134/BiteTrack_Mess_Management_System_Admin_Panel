import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { qr, userId } = req.body;

  // -------------------------------------------------------
  // 1️⃣ JWT is REQUIRED (no fallback, no bypass)
  // -------------------------------------------------------
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  let decoded;
  try {
    const token = auth.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // messId must come ONLY from JWT
  const messId = decoded?.messId;
  if (!messId) {
    return res.status(401).json({ error: "messId missing in token" });
  }

  // -------------------------------------------------------
  // 2️⃣ Extract ONLY userId (QR or direct)
  // -------------------------------------------------------
  let uid = null;

  if (qr) {
    const parts = qr.split("-");
    if (parts.length !== 2) {
      return res.status(400).json({ error: "Invalid QR format. Expected messId-userId" });
    }

    // We ignore QR messId ALWAYS, only use JWT messId
    uid = Number(parts[1]);
  } else if (userId) {
    uid = Number(userId);
  }

  if (!uid || isNaN(uid)) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    // -------------------------------------------------------
    // 3️⃣ Ensure user belongs to this mess (strict)
    // -------------------------------------------------------
    const userCheck = await pgPool.query(
      "SELECT id FROM users WHERE id=$1 AND mess_id=$2",
      [uid, messId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: "User does not belong to this mess" });
    }

    // -------------------------------------------------------
    // 4️⃣ Attendance Logic
    // -------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);

    const already = await pgPool.query(
      "SELECT id FROM attendance WHERE user_id=$1 AND att_date=$2",
      [uid, today]
    );

    if (already.rows.length > 0) {
      return res.status(200).json({ message: "Attendance already marked" });
    }

    await pgPool.query(
      "INSERT INTO attendance (user_id, att_date) VALUES ($1, $2)",
      [uid, today]
    );

    return res.status(200).json({ message: "Attendance marked successfully" });

  } catch (err) {
    console.error("Attendance error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}





// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const { qr, userId } = req.body;

//   // ---------------------------------------
//   // 1️⃣ Extract mess_id from token if available
//   // ---------------------------------------
//   let tokenMessId = null;
//   const authHeader = req.headers.authorization;

//   if (authHeader && authHeader.startsWith("Bearer ")) {
//     try {
//       const token = authHeader.split(" ")[1];
//       const decoded = verifyToken(token);
//       tokenMessId = decoded.mess_id || null;
//     } catch (err) {
//       console.error("Token verification failed:", err);
//       return res.status(401).json({ error: "Invalid or expired token" });
//     }
//   }

//   // ---------------------------------------
//   // 2️⃣ Extract userId + QR fallback logic (old behavior preserved)
//   // ---------------------------------------
//   let messId = 1;
//   let uid = null;

//   if (qr) {
//     const parts = qr.split("-");
//     if (parts.length === 2) {
//       messId = (!parts[0] || parts[0] === "null") ? 1 : Number(parts[0]);
//       uid = Number(parts[1]);
//     } else {
//       return res.status(400).json({ error: "Invalid QR format. Expected messId-userId" });
//     }
//   } else if (userId) {
//     uid = Number(userId);
//   } else {
//     return res.status(400).json({ error: "QR or userId required" });
//   }

//   if (!uid || isNaN(uid)) {
//     return res.status(400).json({ error: "Invalid userId" });
//   }

//   // ---------------------------------------
//   // 3️⃣ If token present → override messId with token mess_id
//   // ---------------------------------------
//   const effectiveMessId = tokenMessId ? tokenMessId : messId;

//   try {
//     // ---------------------------------------
//     // 4️⃣ Validate user belongs to this mess
//     // ---------------------------------------
//     const userCheck = await pgPool.query(
//       "SELECT id FROM users WHERE id=$1 AND mess_id=$2",
//       [uid, effectiveMessId]
//     );

//     if (userCheck.rows.length === 0) {
//       return res.status(403).json({
//         error: "User does not belong to this mess OR mess_id mismatch",
//       });
//     }

//     // ---------------------------------------
//     // 5️⃣ Attendance marking logic (unchanged)
//     // ---------------------------------------
//     const today = new Date().toISOString().slice(0, 10);

//     const now = new Date();
//     const year = now.getFullYear();
//     const month = now.getMonth() + 1;
//     const day = now.getDate();
//     const todayISO = now.toISOString().slice(0, 10);

//     const check = await pgPool.query(
//       "SELECT id FROM attendance WHERE user_id=$1 AND att_date=$2",
//       [uid, today]
//     );

//     if (check.rows.length === 0) {
//       // Attendance insert
//       await pgPool.query(
//         "INSERT INTO attendance (user_id, att_date) VALUES ($1, $2)",
//         [uid, today]
//       );

//       // Monthly attendance update
//       await pgPool.query(
//         `
//         INSERT INTO monthly_attendance (user_id, year, month, days_present, attendance_map)
//         VALUES ($1, $2, $3, 1, jsonb_build_object($4::text, 'present'))
//         ON CONFLICT (user_id, year, month)
//         DO UPDATE SET
//           days_present = monthly_attendance.days_present + 1,
//           attendance_map = monthly_attendance.attendance_map || jsonb_build_object($4::text, 'present');
//         `,
//         [uid, year, month, day]
//       );

//       // Bills update
//       await pgPool.query(
//         `
//         INSERT INTO bills (user_id, year, month, days_billed, total_amount, per_day_rate, first_attendance_date)
//         SELECT $1, $2, $3, 1, per_day_rate, per_day_rate, $4
//         FROM messes WHERE id=$5
//         ON CONFLICT (user_id, year, month)
//         DO UPDATE SET
//           days_billed = bills.days_billed + 1,
//           total_amount = (bills.days_billed + 1) * bills.per_day_rate,
//           last_updated = NOW(),
//           first_attendance_date = COALESCE(bills.first_attendance_date, $4);
//         `,
//         [uid, year, month, todayISO, effectiveMessId]
//       );

//       return res.status(200).json({ message: "Attendance marked successfully" });
//     } else {
//       return res.status(200).json({ message: "Attendance already marked for today" });
//     }
//   } catch (err) {
//     console.error("Database error:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }
