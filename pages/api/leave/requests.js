// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   // 🟦 GET — Fetch pending leave requests for a specific mess
//   if (req.method === "GET") {
//     try {
//       const { mess_id } = req.query;

//       if (!mess_id) {
//         return res.status(400).json({ error: "mess_id is required" });
//       }

//       const query = `
//         SELECT lr.*, u.name AS user_name, u.email AS user_email, u.contact_no
//         FROM leave_requests lr
//         LEFT JOIN users u ON lr.user_id = u.id
//         WHERE lr.status = 'Pending' 
//           AND lr.mess_id = $1
//         ORDER BY lr.created_at DESC;
//       `;

//       const { rows } = await pgPool.query(query, [mess_id]);
//       res.status(200).json(rows);

//     } catch (err) {
//       console.error("❌ Error fetching leave requests:", err);
//       res.status(500).json({ error: "Failed to fetch leave requests" });
//     }
//   }

//   // 🟩 PATCH — Approve or Reject request
//   if (req.method === "PATCH") {
//     try {
//       const { id, status } = req.body;
//       if (!id || !status)
//         return res.status(400).json({ error: "Missing ID or status" });

//       // Update leave request
//       const update = await pgPool.query(
//         `UPDATE leave_requests 
//          SET status = $1, updated_at = NOW() 
//          WHERE id = $2 
//          RETURNING *;`,
//         [status, id]
//       );

//       if (update.rowCount === 0) {
//         return res.status(404).json({ error: "Leave request not found" });
//       }

//       const reqRow = update.rows[0];

//       // If Approved → Move to history
//       if (status !== "Pending") {

//         // Prevent duplicate insert
//         await pgPool.query(
//           `DELETE FROM leave_history WHERE request_id = $1`,
//           [id]
//         );

//         await pgPool.query(
//           `INSERT INTO leave_history 
//             (request_id, user_id, user_name, user_email, mess_id, mess_name, hostel_name, room_no,
//              from_date, to_date, days_count, status, created_at, updated_at)
//            VALUES 
//             ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW());`,
//           [
//             reqRow.id,
//             reqRow.user_id,
//             reqRow.username || reqRow.user_name,
//             reqRow.email,
//             reqRow.mess_id,
//             reqRow.mess_name,
//             reqRow.hostel_name,
//             reqRow.room_no,
//             reqRow.from_date,
//             reqRow.to_date,
//             reqRow.days_count,
//             status,
//           ]
//         );
//       }

//       res.status(200).json({ success: true });

//     } catch (err) {
//       console.error("❌ Error updating leave status:", err);
//       res.status(500).json({ error: "Failed to update leave status" });
//     }
//   }

//   // 🟥 DELETE — remove leave request
//   if (req.method === "DELETE") {
//     try {
//       const { id } = req.query;

//       if (!id) return res.status(400).json({ error: "Missing ID" });

//       await pgPool.query("DELETE FROM leave_requests WHERE id = $1", [id]);

//       // Optional: Also remove from history
//       await pgPool.query("DELETE FROM leave_history WHERE request_id = $1", [id]);

//       res.status(200).json({ success: true });

//     } catch (err) {
//       console.error("❌ Error deleting leave request:", err);
//       res.status(500).json({ error: "Failed to delete leave request" });
//     }
//   }
// }





import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // ====================================================
  // 🔐 VERIFY TOKEN (Same pattern as notifications.js)
  // ====================================================
  let messId = null;

  try {
    const auth = req.headers?.authorization;

    if (!auth) {
      return res.status(401).json({ ok: false, message: "Token missing. Login again." });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    if (!decoded?.messId) {
      return res.status(401).json({ ok: false, message: "messId missing in token." });
    }

    messId = decoded.messId;

  } catch (err) {
    return res.status(401).json({ ok: false, message: "Invalid or expired token." });
  }

  // ====================================================
  // 1️⃣ GET — Fetch pending leave requests for THIS mess
  // ====================================================
  if (req.method === "GET") {
    try {
      const query = `
  SELECT lr.*, u.name AS user_name, u.email AS user_email
  FROM leave_requests lr
  LEFT JOIN users u ON lr.user_id = u.id
  WHERE lr.status = 'Pending'
    AND lr.mess_id = $1
  ORDER BY lr.created_at DESC;
`;


      const { rows } = await pgPool.query(query, [messId]);
      return res.status(200).json(rows);

    } catch (err) {
      console.error("❌ Error fetching leave requests:", err);
      return res.status(500).json({ error: "Failed to fetch leave requests" });
    }
  }

  // ====================================================
  // 2️⃣ PATCH — Approve or Reject leave request
  // ====================================================
  if (req.method === "PATCH") {
    try {
      const { id, status } = req.body;
      if (!id || !status)
        return res.status(400).json({ error: "Missing ID or status" });

      // Update main table
      const update = await pgPool.query(
        `UPDATE leave_requests
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND mess_id = $3
         RETURNING *;`,
        [status, id, messId]
      );

      if (update.rowCount === 0)
        return res.status(404).json({ error: "Leave request not found" });

      const reqRow = update.rows[0];

      // If approved/rejected → move to history
      if (status !== "Pending") {

        // Avoid duplicates
        await pgPool.query(
          `DELETE FROM leave_history WHERE request_id = $1`,
          [id]
        );

        await pgPool.query(
          `INSERT INTO leave_history
            (request_id, user_id, user_name, user_email, mess_id, mess_name, hostel_name, room_no,
             from_date, to_date, days_count, status, created_at, updated_at)
           VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW());`,
          [
            reqRow.id,
            reqRow.user_id,
            reqRow.username || reqRow.user_name,
            reqRow.email,
            reqRow.mess_id,
            reqRow.mess_name,
            reqRow.hostel_name,
            reqRow.room_no,
            reqRow.from_date,
            reqRow.to_date,
            reqRow.days_count,
            status,
          ]
        );
      }

      return res.status(200).json({ success: true });

    } catch (err) {
      console.error("❌ Error updating leave status:", err);
      return res.status(500).json({ error: "Failed to update leave status" });
    }
  }

  // ====================================================
  // 3️⃣ DELETE — Delete leave request + history
  // ====================================================
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id) return res.status(400).json({ error: "Missing ID" });

      // Delete only within same mess
      await pgPool.query(
        "DELETE FROM leave_requests WHERE id=$1 AND mess_id=$2",
        [id, messId]
      );

      await pgPool.query(
        "DELETE FROM leave_history WHERE request_id=$1",
        [id]
      );

      return res.status(200).json({ success: true });

    } catch (err) {
      console.error("❌ Error deleting leave request:", err);
      return res.status(500).json({ error: "Failed to delete leave request" });
    }
  }

  // ====================================================
  // Unsupported
  // ====================================================
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
