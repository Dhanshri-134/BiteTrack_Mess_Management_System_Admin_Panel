// pages/api/notifications.js
import { pgPool } from "../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const { method } = req;

  // ====================================================
  // 🔐 VERIFY TOKEN — REQUIRED ALWAYS
  // ====================================================
  let tokenMessId = null;

  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ ok: false, message: "Token missing. Login again." });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey");

    if (!decoded?.messId) {
      return res.status(401).json({ ok: false, message: "messId missing in token. Login again." });
    }

    tokenMessId = decoded.messId;
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Invalid or expired token. Login again." });
  }

  // If reached here → token OK and messId OK
  const messId = tokenMessId;

  try {
    // ====================================================
    // 1️⃣ GET — Fetch notifications for THIS mess only
    // ====================================================
    if (method === "GET") {
      const query = `
        SELECT * FROM notifications
        WHERE mess_id = $1 
        ORDER BY created_at DESC
      `;

      const result = await pgPool.query(query, [messId]);
      return res.status(200).json(result.rows);
    }

    // ====================================================
    // 2️⃣ POST — Create & Broadcast Notification
    // ====================================================
    if (method === "POST") {
      const {
        title,
        message,
        notification_type = "general",
        priority = "normal",
        expires_at = null
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: "Missing title or message" });
      }

      const sql = `
        SELECT broadcast_notification(
          $1, $2, $3, $4, $5, $6
        ) AS sent_count;
      `;

      const values = [
        title,
        message,
        notification_type,
        priority,
        messId,   // 👍 always use mess from token
        expires_at
      ];

      const { rows } = await pgPool.query(sql, values);

      return res.status(201).json({
        message: `✔ Sent to ${rows[0].sent_count} members`
      });
    }

    // ====================================================
    // 3️⃣ PUT — Update a notification (only this mess)
    // ====================================================
    if (method === "PUT") {
      const { id, title, message, notification_type, priority, expires_at } =
        req.body;

      await pgPool.query(
        `
          UPDATE notifications
          SET title=$1, message=$2, notification_type=$3, priority=$4, expires_at=$5
          WHERE id=$6 AND mess_id=$7
        `,
        [title, message, notification_type, priority, expires_at || null, id, messId]
      );

      return res.status(200).json({ message: "Notification updated" });
    }

    // ====================================================
    // 4️⃣ DELETE — Delete notification (only this mess)
    // ====================================================
    if (method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Notification ID required" });
      }

      await pgPool.query(
        `DELETE FROM notifications WHERE id=$1 AND mess_id=$2`,
        [id, messId]
      );

      return res.status(200).json({ message: "Notification deleted" });
    }

    // ====================================================
    // ❌ Unsupported
    // ====================================================
    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ error: `Method ${method} Not Allowed` });

  } catch (err) {
    console.error("❌ Notification API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
