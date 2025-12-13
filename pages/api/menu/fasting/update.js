


// // pages/api/fasting/update.js
// import { pgPool } from "@/lib/db";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const { id, status } = req.body;
//   if (!id || !status) return res.status(400).json({ error: "id and status required" });

//   const allowedStatuses = ["approved", "rejected"];
//   if (!allowedStatuses.includes(status.trim())) {
//     return res.status(400).json({ error: "Invalid status value" });
//   }

//   // -----------------------------
//   // 🔐 Verify JWT token
//   // -----------------------------
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ error: "Unauthorized: token required" });
//   }

//   let decoded;
//   try {
//     const token = authHeader.split(" ")[1];
//     decoded = jwt.verify(token, process.env.JWT_SECRET);
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }

//   const messId = decoded.messId;
//   if (!messId) return res.status(400).json({ error: "messId missing in token" });

//   const client = await pgPool.connect();
//   try {
//     // -----------------------------
//     // Update only requests belonging to this mess
//     // -----------------------------
//     const result = await client.query(
//       `
//       UPDATE fasting_requests
//       SET status = $1, updated_at = NOW()
//       WHERE id = $2 AND mess_id = $3
//       RETURNING id
//       `,
//       [status.trim(), id, messId]
//     );

//     if (result.rowCount === 0) {
//       return res.status(404).json({
//         error: "Fasting request not found or not authorized",
//       });
//     }

//     res.status(200).json({ message: `Request ${status} successfully.` });
//   } catch (err) {
//     console.error("❌ Error updating fasting request:", err);
//     res.status(500).json({ error: "Failed to update fasting request" });
//   } finally {
//     client.release();
//   }
// }
// pages/api/fasting/update.js
import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: "id and status required" });
  }

  const allowedStatuses = ["approved", "rejected"];
  if (!allowedStatuses.includes(status.trim())) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  // ====================================================
  // 🔐 STRICT TOKEN VALIDATION (JWT ONLY)
  // ====================================================
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) {
    return res.status(400).json({ error: "messId missing in token" });
  }

  // ====================================================
  // 📝 UPDATE ONLY THIS MESS'S REQUEST
  // ====================================================
  const client = await pgPool.connect();
  try {
    const result = await client.query(
      `
      UPDATE fasting_requests
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND mess_id = $3
      RETURNING id
      `,
      [status.trim(), id, messId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Fasting request not found or not authorized",
      });
    }

    return res.status(200).json({
      message: `Request ${status} successfully.`,
    });
  } catch (err) {
    console.error("❌ Error updating fasting request:", err);
    return res.status(500).json({ error: "Failed to update fasting request" });
  } finally {
    client.release();
  }
}
