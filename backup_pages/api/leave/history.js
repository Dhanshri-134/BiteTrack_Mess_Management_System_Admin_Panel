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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
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

  try {
    const { rows } = await pgPool.query(
      `SELECT
        lh.*,
        COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(lh.user_name), ''), '-') AS user_name,
        COALESCE(NULLIF(TRIM(u.email), ''), NULLIF(TRIM(lh.user_email), ''), '-') AS user_email,
        COALESCE(
          NULLIF(TRIM(u.phone), ''),
          NULLIF(TRIM(to_jsonb(lh) ->> 'contact_no'), ''),
          NULLIF(TRIM(to_jsonb(lh) ->> 'phone'), ''),
          '-'
        ) AS contact_no
      FROM leave_history lh
      LEFT JOIN users u
        ON u.id = lh.user_id
       AND u.mess_id = lh.mess_id
      WHERE lh.mess_id = $1
        AND lh.status IN ('Approved', 'Rejected')
      ORDER BY lh.updated_at DESC, lh.created_at DESC`,
      [messId]
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching leave history:", error);
    return res.status(500).json({ error: "Failed to fetch leave history" });
  }
}
