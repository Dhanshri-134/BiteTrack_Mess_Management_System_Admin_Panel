import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

function readMessId(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    throw new Error("TOKEN_MISSING");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded?.messId) {
    throw new Error("MESS_ID_MISSING");
  }

  return decoded.messId;
}

async function syncLeaveHistory({ requestId, messId, status }) {
  await pgPool.query(
    `DELETE FROM leave_history
     WHERE request_id = $1 AND mess_id = $2`,
    [requestId, messId]
  );

  if (status === "Pending") {
    return;
  }

  await pgPool.query(
    `INSERT INTO leave_history
      (
        request_id,
        user_id,
        user_name,
        user_email,
        mess_id,
        mess_name,
        hostel_name,
        room_no,
        from_date,
        to_date,
        days_count,
        status,
        created_at,
        updated_at
      )
     SELECT
        lr.id,
        lr.user_id,
        COALESCE(
          NULLIF(TRIM(u.name), ''),
          NULLIF(TRIM(to_jsonb(lr) ->> 'user_name'), ''),
          NULLIF(TRIM(to_jsonb(lr) ->> 'username'), ''),
          'Unknown'
        ),
        COALESCE(
          NULLIF(TRIM(u.email), ''),
          NULLIF(TRIM(to_jsonb(lr) ->> 'user_email'), ''),
          NULLIF(TRIM(to_jsonb(lr) ->> 'email'), ''),
          ''
        ),
        lr.mess_id,
        lr.mess_name,
        lr.hostel_name,
        lr.room_no,
        lr.from_date,
        lr.to_date,
        lr.days_count,
        $3,
        NOW(),
        NOW()
     FROM leave_requests lr
     LEFT JOIN users u
       ON u.id = lr.user_id
      AND u.mess_id = lr.mess_id
     WHERE lr.id = $1
       AND lr.mess_id = $2`,
    [requestId, messId, status]
  );
}

const requestSelect = `
  SELECT
    lr.*,
    COALESCE(
      NULLIF(TRIM(u.name), ''),
      NULLIF(TRIM(to_jsonb(lr) ->> 'user_name'), ''),
      NULLIF(TRIM(to_jsonb(lr) ->> 'username'), ''),
      '-'
    ) AS user_name,
    COALESCE(
      NULLIF(TRIM(u.email), ''),
      NULLIF(TRIM(to_jsonb(lr) ->> 'user_email'), ''),
      NULLIF(TRIM(to_jsonb(lr) ->> 'email'), ''),
      '-'
    ) AS user_email,
    COALESCE(
      NULLIF(TRIM(u.phone), ''),
      NULLIF(TRIM(to_jsonb(lr) ->> 'contact_no'), ''),
      NULLIF(TRIM(to_jsonb(lr) ->> 'phone'), ''),
      '-'
    ) AS contact_no
  FROM leave_requests lr
  LEFT JOIN users u
    ON u.id = lr.user_id
   AND u.mess_id = lr.mess_id
`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let messId;

  try {
    messId = readMessId(req);
  } catch (error) {
    return res.status(401).json({
      error:
        error.message === "TOKEN_MISSING"
          ? "Authorization token required"
          : "Invalid or expired token",
    });
  }

  if (req.method === "GET") {
    try {
      const { rows } = await pgPool.query(
        `${requestSelect}
         WHERE lr.status = 'Pending'
           AND lr.mess_id = $1
         ORDER BY lr.created_at DESC`,
        [messId]
      );

      return res.status(200).json(rows);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      return res.status(500).json({ error: "Failed to fetch leave requests" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const id = Number(req.body?.id);
      const nextStatus = String(req.body?.status || req.body?.action || "").trim();

      if (!id || !["Pending", "Approved", "Rejected"].includes(nextStatus)) {
        return res.status(400).json({ error: "Valid request id and status are required" });
      }

      const updateResult = await pgPool.query(
        `UPDATE leave_requests
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
           AND mess_id = $3
         RETURNING id`,
        [nextStatus, id, messId]
      );

      if (updateResult.rowCount === 0) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      await syncLeaveHistory({ requestId: id, messId, status: nextStatus });

      const refreshed = await pgPool.query(
        `${requestSelect}
         WHERE lr.id = $1
           AND lr.mess_id = $2`,
        [id, messId]
      );

      return res.status(200).json({
        success: true,
        request: refreshed.rows[0] || null,
      });
    } catch (error) {
      console.error("Error updating leave request:", error);
      return res.status(500).json({ error: "Failed to update leave request" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const id = Number(req.query?.id);

      if (!id) {
        return res.status(400).json({ error: "Leave request id is required" });
      }

      await pgPool.query(
        `DELETE FROM leave_history
         WHERE request_id = $1
           AND mess_id = $2`,
        [id, messId]
      );

      const deleteResult = await pgPool.query(
        `DELETE FROM leave_requests
         WHERE id = $1
           AND mess_id = $2`,
        [id, messId]
      );

      if (deleteResult.rowCount === 0) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting leave request:", error);
      return res.status(500).json({ error: "Failed to delete leave request" });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
