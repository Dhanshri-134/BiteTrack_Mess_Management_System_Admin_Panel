





import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ======================================================
    // 🔐 JWT VERIFY (NO FALLBACKS)
    // ======================================================
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.messId) {
      return res.status(401).json({ ok: false, message: "Invalid token" });
    }

    const messId = decoded.messId;

    // ======================================================
    // 🔵 GET — Fetch Mess Info
    // ======================================================
    if (req.method === "GET") {
      const { rows } = await pgPool.query(
        `
        SELECT
          name,
          email,
          per_day_rate,
          stamp_image,
          privacy_policy,
          terms_conditions,
          contact_info,
          signature_image,
          description,
          location,
          rating,
          total_reviews,
          open_time,
          active_members,
          specialties,
          monthly_price,
          image,
          features,
          logo,
          owner_photo,
          mess_images
        FROM messes
        WHERE id = $1
        LIMIT 1
        `,
        [messId]
      );

      if (!rows.length) {
        return res.status(404).json({ ok: false, message: "Mess not found" });
      }

      const data = rows[0];

      // 🧠 Parse JSON / JSONB fields safely
      ["privacy_policy", "terms_conditions", "contact_info", "features", "mess_images"].forEach(
        (key) => {
          if (typeof data[key] === "string") {
            try {
              data[key] = JSON.parse(data[key]);
            } catch {}
          }
        }
      );

      return res.status(200).json(data);
    }

    // ======================================================
    // 🟢 POST — Update Mess Info (URLs ONLY)
    // ======================================================
    if (req.method === "POST") {
      const ALLOWED_FIELDS = [
  "name",
  "location",
  "open_time",
  "description",
  "per_day_rate",
  "monthly_price",
  "allowed_leave_days",
  "features",
  "specialties",
  "logo",
  "owner_photo",
  "stamp_image",
  "signature_image",
  "mess_images",
];

const updates = {};
for (const key of ALLOWED_FIELDS) {
  if (req.body[key] !== undefined) {
    updates[key] = req.body[key];
  }
}


      // Convert objects → JSON strings
      ["privacy_policy", "terms_conditions", "contact_info"].forEach((key) => {
        if (updates[key] && typeof updates[key] !== "string") {
          updates[key] = JSON.stringify(updates[key]);
        }
      });

      // Remove empty values
      Object.keys(updates).forEach((k) => {
        if (updates[k] === undefined || updates[k] === null) delete updates[k];
      });

      const fields = Object.keys(updates);
      if (!fields.length) {
        return res.status(400).json({ ok: false, message: "No fields to update" });
      }

      const values = Object.values(updates);

      const setClause = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(", ");

      await pgPool.query(
        `
        UPDATE messes
        SET ${setClause}
        WHERE id = $${fields.length + 1}
        `,
        [...values, messId]
      );

      return res.status(200).json({
        ok: true,
        message: "Mess info updated successfully",
      });
    }

    return res.status(405).json({ ok: false, message: "Method not allowed" });
  } catch (err) {
    console.error("❌ messInfo API error:", err);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
}
