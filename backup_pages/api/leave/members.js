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
    const approvedMembers = await pgPool.query(
      `SELECT
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
        ) AS phone
      FROM leave_requests lr
      LEFT JOIN users u
        ON u.id = lr.user_id
       AND u.mess_id = lr.mess_id
      WHERE lr.mess_id = $1
        AND lr.status = 'Approved'
        AND CURRENT_DATE BETWEEN lr.from_date AND lr.to_date
      ORDER BY lr.from_date`,
      [messId]
    );

    return res.status(200).json({
      approved_members: approvedMembers.rows,
      excess_absent_members: [],
    });
  } catch (error) {
    console.error("Error fetching leave members:", error);
    return res.status(500).json({ error: "Failed to fetch leave members" });
  }
}
