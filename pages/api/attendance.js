// import { pgPool } from "../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ error: "Method not allowed" });

//   const { qr } = req.body;
//   if (!qr) return res.status(400).json({ error: "QR code required" });

//   const [messIdStr, userIdStr] = qr.split("-");
//   const messId = parseInt(messIdStr);
//   const userId = parseInt(userIdStr);

//   if (!messId || !userId) {
//     return res.status(400).json({ error: "Invalid QR code" });
//   }

//   const today = new Date().toISOString().slice(0, 10);
//   const client = await pgPool.connect();

//   try {
//     await client.query("BEGIN");

//     const userRes = await client.query(
//       `SELECT id, name FROM users WHERE id=$1 AND mess_id=$2 AND verified=true`,
//       [userId, messId]
//     );

//     if (userRes.rows.length === 0) {
//       await client.query("ROLLBACK");
//       return res.status(404).json({ error: "User not found or not verified" });
//     }

//     // Try insert attendance
//     const insertRes = await client.query(
//       `INSERT INTO attendance (user_id, att_date)
//        VALUES ($1, $2)
//        ON CONFLICT (user_id, att_date) DO NOTHING
//        RETURNING *`,
//       [userId, today]
//     );

//     await client.query("COMMIT");

//     const message =
//       insertRes.rows.length > 0
//         ? "Today's attendance marked successfully"
//         : "Today's attendance is already marked";

//     res.json({
//       ok: true,
//       date: today,
//       name: userRes.rows[0].name,
//       message,
//     });
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { qr } = req.body;
  if (!qr) return res.status(400).json({ error: "QR code required" });

  // Extract old QR values
  const [qrMessStr, qrUserStr] = qr.split("-");
  const qrMessId = parseInt(qrMessStr);
  const userId = parseInt(qrUserStr);

  if (!qrMessId || !userId) {
    return res.status(400).json({ error: "Invalid QR code" });
  }

  // --------------------------------------------
  // 🔐 USE TOKEN MESS ID IF AVAILABLE
  // --------------------------------------------
  let messId = qrMessId; // fallback (old behavior)

  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      if (decoded?.mess_id) {
        messId = decoded.messId; // override QR mess_id
      }
    }
  } catch (e) {
    console.log("Token optional → continuing with QR mess_id");
  }

  const today = new Date().toISOString().slice(0, 10);
  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT id, name 
       FROM users 
       WHERE id = $1 
         AND mess_id = $2 
         AND verified = true`,
      [userId, messId]
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "User not found or not verified" });
    }

    const insertRes = await client.query(
      `INSERT INTO attendance (user_id, att_date)
       VALUES ($1, $2)
       ON CONFLICT (user_id, att_date) DO NOTHING
       RETURNING *`,
      [userId, today]
    );

    await client.query("COMMIT");

    const message =
      insertRes.rows.length > 0
        ? "Today's attendance marked successfully"
        : "Today's attendance is already marked";

    return res.json({
      ok: true,
      date: today,
      name: userRes.rows[0].name,
      message,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
