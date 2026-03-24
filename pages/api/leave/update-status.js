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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!["POST", "PATCH"].includes(req.method)) {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let messId;

  try {
    messId = readMessId(req);
  } catch (error) {
    return res.status(401).json({
      message:
        error.message === "TOKEN_MISSING"
          ? "Authorization token required"
          : "Invalid or expired token",
    });
  }

  try {
    const id = Number(req.body?.id);
    const action = String(req.body?.action || req.body?.status || "").trim();

    if (!id || !["Pending", "Approved", "Rejected"].includes(action)) {
      return res.status(400).json({ message: "Valid id and action are required" });
    }

    const { rows } = await pgPool.query(
      `UPDATE leave_requests
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
         AND mess_id = $3
       RETURNING id, status`,
      [action, id, messId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    await syncLeaveHistory({ requestId: id, messId, status: action });

    return res.status(200).json({
      ok: true,
      message: `Leave ${action.toLowerCase()} successfully`,
      request: rows[0],
    });
  } catch (error) {
    console.error("Leave update error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
