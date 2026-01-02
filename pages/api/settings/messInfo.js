// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   try {
//     if (req.method === "GET") {
//       // Fetch mess info
//       const query = `
//         SELECT 
//           id,
//           name
//         FROM messes
//         LIMIT 1;
//       `;
//       const { rows } = await pgPool.query(query);
//       return res.status(200).json(rows[0] || {});
//     }

//     if (req.method === "POST") {
//       const {
//         id,
//         name
//       } = req.body;

//       if (!name || !contact) {
//         return res.status(400).json({ ok: false, message: "Missing required fields." });
//       }

//       // Update or insert if not exists
//       const query = `
//         INSERT INTO messes (id, name, contact, address, description, rules, policies, features, functionalities, updated_at)
//         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
//         ON CONFLICT (id)
//         DO UPDATE SET
//           name = EXCLUDED.name,
//           contact = EXCLUDED.contact,
//           address = EXCLUDED.address,
//           description = EXCLUDED.description,
//           rules = EXCLUDED.rules,
//           policies = EXCLUDED.policies,
//           features = EXCLUDED.features,
//           functionalities = EXCLUDED.functionalities,
//           updated_at = NOW()
//         RETURNING id;
//       `;

//       const values = [
//         id || 1,
//         name,
//         contact,
//         address,
//         description,
//         rules,
//         policies,
//         features,
//         functionalities,
//       ];

//       const result = await pgPool.query(query, values);
//       return res.status(200).json({ ok: true, id: result.rows[0].id, message: "Mess info updated successfully." });
//     }

//     // Unsupported method
//     return res.status(405).json({ ok: false, message: "Method not allowed." });
//   } catch (error) {
//     console.error("Error in /api/settings/messInfo:", error);
//     res.status(500).json({ ok: false, message: "Internal server error." });
//   }
// }




// import { pgPool } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   try {
//     // ✅ Ensure token is sent
//     if (!req.headers.authorization) {
//       return res.status(401).json({ ok: false, message: "Unauthorized" });
//     }

//     const decoded = verifyToken(req); // reads token from headers
//     if (!decoded?.messId) {
//       return res.status(401).json({ ok: false, message: "Invalid token" });
//     }

//     const messId = decoded.messId;

//     // --------------------- GET: Fetch mess details ---------------------
//     if (req.method === "GET") {
//       const { rows } = await pgPool.query(
//         `SELECT 
//           name, per_day_rate, stamp_image, privacy_policy, terms_conditions, contact_info,
//           signature_image, description, location, rating, total_reviews, open_time,
//           active_members, specialties, monthly_price, image, features, logo,
//           owner_photo, mess_images
//          FROM messes
//          WHERE id = $1`,
//         [messId]
//       );

//       // Parse JSON/array fields before sending to frontend
//       const messData = rows[0] || {};
//       ["privacy_policy", "terms_conditions", "contact_info", "features", "mess_images"].forEach(
//         (key) => {
//           if (messData[key]) {
//             try {
//               messData[key] = JSON.parse(messData[key]);
//             } catch (err) {
//               messData[key] = messData[key]; // fallback if not JSON
//             }
//           }
//         }
//       );

//       return res.status(200).json(messData);
//     }

//     // --------------------- POST: Update mess details ---------------------
//     if (req.method === "POST") {
//       let updates = req.body;

//       // Convert arrays/objects to JSON strings for PG
//       ["features", "privacy_policy", "terms_conditions", "contact_info", "mess_images"].forEach(
//         (key) => {
//           if (updates[key]) updates[key] = JSON.stringify(updates[key]);
//         }
//       );

//       const keys = Object.keys(updates);
//       const values = Object.values(updates);

//       if (keys.length === 0) {
//         return res.status(400).json({ ok: false, message: "No fields to update" });
//       }

//       const setString = keys.map((k, i) => `${k}=$${i + 1}`).join(", ");

//       const query = `UPDATE messes SET ${setString} WHERE id=$${keys.length + 1} RETURNING id`;

//       const { rows } = await pgPool.query(query, [...values, messId]);

//       return res
//         .status(200)
//         .json({ ok: true, id: rows[0].id, message: "Mess info updated successfully." });
//     }

//     return res.status(405).json({ ok: false, message: "Method not allowed" });
//   } catch (err) {
//     console.error("Error in /api/settings/messInfo:", err);
//     return res.status(500).json({ ok: false, message: "Internal server error" });
//   }
// }











// import { supabaseAdmin } from "@/lib/supabaseAdmin";

// export default async function handler(req, res) {
//   try {
//     const messId = req.query.messId ;

//     // --------------------- GET: Fetch mess details ---------------------
//     if (req.method === "GET") {
//       const { data, error } = await supabaseAdmin
//         .from("messes")
//         .select(
//           `name, per_day_rate, stamp_image, privacy_policy, terms_conditions, contact_info,
//            signature_image, description, location, rating, total_reviews, open_time,
//            active_members, specialties, monthly_price, image, features, logo,
//            owner_photo, mess_images`
//         )
//         .eq("id", messId)
//         .single();

//       if (error) {
//         console.error("Supabase GET error:", error);
//         return res.status(500).json({ ok: false, message: error.message });
//       }

//       // Parse JSON/array fields before sending to frontend
//       ["privacy_policy", "terms_conditions", "contact_info", "features", "mess_images"].forEach(
//         (key) => {
//           if (data[key] && typeof data[key] === "string") {
//             try {
//               data[key] = JSON.parse(data[key]);
//             } catch (err) {
//               data[key] = data[key]; // fallback if not JSON
//             }
//           }
//         }
//       );

//       return res.status(200).json(data);
//     }

//     // --------------------- POST: Update mess details ---------------------
//     if (req.method === "POST") {
//       let updates = req.body;

//       // Convert arrays/objects to JSON strings for PG
//       ["features", "privacy_policy", "terms_conditions", "contact_info", "mess_images"].forEach(
//         (key) => {
//           if (updates[key] && typeof updates[key] !== "string") updates[key] = JSON.stringify(updates[key]);
//         }
//       );

//       const { data, error } = await supabaseAdmin
//         .from("messes")
//         .update(updates)
//         .eq("id", messId)
//         .select("id")
//         .single();

//       if (error) {
//         console.error("Supabase POST error:", error);
//         return res.status(500).json({ ok: false, message: error.message });
//       }

//       return res
//         .status(200)
//         .json({ ok: true, id: data.id, message: "Mess info updated successfully." });
//     }

//     return res.status(405).json({ ok: false, message: "Method not allowed" });
//   } catch (err) {
//     console.error("Error in /api/settings/messInfo:", err);
//     return res.status(500).json({ ok: false, message: "Internal server error" });
//   }
// }










import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyToken } from "@/lib/auth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb", // support images
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  try {
    // ------------------------------------------------------------------
    // 🔐 VERIFY TOKEN & EXTRACT messId
    // ------------------------------------------------------------------
    const decoded = verifyToken(req);
    if (!decoded || !decoded.messId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const messId = decoded.messId;

    // ==================================================================
    // 🔵 1. GET — Fetch Mess Info
    // ==================================================================
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("messes")
        .select(
          `name, per_day_rate, stamp_image, privacy_policy, terms_conditions,
           contact_info, signature_image, description, location, rating,
           total_reviews, open_time, active_members, specialties, monthly_price,
           image, features, logo, owner_photo, mess_images`
        )
        .eq("id", messId)
        .single();

      if (error) {
        console.error("Supabase GET error:", error);
        return res.status(500).json({ ok: false, message: error.message });
      }

      // 🔄 Parse JSON strings
      ["privacy_policy", "terms_conditions", "contact_info", "features", "mess_images"].forEach((key) => {
        if (data[key] && typeof data[key] === "string") {
          try {
            data[key] = JSON.parse(data[key]);
          } catch (_) {}
        }
      });

      return res.status(200).json(data);
    }

    // ==================================================================
    // 🔵 2. POST — Save / Update Mess Info
    // ==================================================================
    if (req.method === "POST") {
      let updates = req.body;

      // ---------------------------------------------------------------
      // 🟣 UPLOAD FILES TO SUPABASE STORAGE IF PRESENT
      // ---------------------------------------------------------------
      // async function uploadFileIfNeeded(file, folder) {
      //   if (!file || !file.base64) return null;

      //   const fileExt = file.name.split(".").pop();
      //   const fileName = `${folder}/${Date.now()}.${fileExt}`;
      //   const buffer = Buffer.from(file.base64, "base64");

      //   const { error: uploadError } = await supabaseAdmin.storage
      //     .from("mess-assets")
      //     .upload(fileName, buffer, { contentType: file.type });

      //   if (uploadError) {
      //     console.error("File upload error:", uploadError);
      //     return null;
      //   }

      //   const { data } = supabaseAdmin.storage
      //     .from("mess-assets")
      //     .getPublicUrl(fileName);

      //   return data.publicUrl;
      // }

      // Upload individual files
      updates.logo = await uploadFileIfNeeded(updates.logo, `logo-${messId}`);
      updates.stamp_image =
        await uploadFileIfNeeded(updates.stamp_image, `stamp-${messId}`);
      updates.signature_image =
        await uploadFileIfNeeded(updates.signature_image, `sign-${messId}`);
      updates.owner_photo =
        await uploadFileIfNeeded(updates.owner_photo, `owner-${messId}`);

      // Upload multiple mess images
      if (updates.mess_images && Array.isArray(updates.mess_images)) {
        const uploadedImages = [];
        for (let img of updates.mess_images) {
          const url = await uploadFileIfNeeded(
            img,
            `mess-images-${messId}`
          );
          if (url) uploadedImages.push(url);
        }
        updates.mess_images = uploadedImages;
        // updates.mess_images = JSON.stringify(uploadedImages);
      }

      // Convert JSONB fields to string
["privacy_policy", "terms_conditions", "contact_info"].forEach((key) => {
  if (updates[key] && typeof updates[key] !== "string") {
    updates[key] = JSON.stringify(updates[key]);
  }
});
Object.keys(updates).forEach((key) => {
  if (updates[key] === null || updates[key] === undefined) {
    delete updates[key];
  }
});


      // ---------------------------------------------------------------
      // 🟢 Save to DB
      // ---------------------------------------------------------------
      const { data, error } = await supabaseAdmin
        .from("messes")
        .update(updates)
        .eq("id", messId)
        .select("id")
        .single();

      if (error) {
        console.error("Supabase POST error:", error);
        return res.status(500).json({ ok: false, message: error.message });
      }

      return res.status(200).json({
        ok: true,
        id: data.id,
        message: "Mess info updated successfully.",
      });
    }

    return res.status(405).json({ ok: false, message: "Method not allowed" });
  } catch (err) {
    console.error("Error in /api/settings/messInfo:", err);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
}
