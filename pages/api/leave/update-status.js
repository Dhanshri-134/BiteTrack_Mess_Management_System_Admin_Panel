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
  res.setHeader("Access-Control-Allow-Methods", "POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!["POST", "PATCH"].includes(req.method)) {
    return res.status(405).json({ message: "Method not allowed" });
  }

  console.log("API WORK STARTED..");

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

  console.log("GOT MESS ID", messId);

  try {
    const id = Number(req.body?.id);
    const action = String(req.body?.action || req.body?.status || "").trim();

    if (!id || !["Pending", "Approved", "Rejected"].includes(action)) {
      return res.status(400).json({
        message: "Valid id and action are required",
      });
    }

    console.log("GOT ACTION FILTER");

    const { rows } = await pgPool.query(
      `UPDATE leave_requests
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
         AND mess_id = $3
       RETURNING id, status`,
      [action, id, messId]
    );

    console.log("UPDATE QUERY HIT..");

    if (!rows.length) {
      return res.status(404).json({
        message: "Leave request not found",
      });
    }

    return res.status(200).json({
      ok: true,
      message: `Leave ${action.toLowerCase()} successfully`,
      request: rows[0],
    });
  } catch (error) {
    console.error("Leave update error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
}