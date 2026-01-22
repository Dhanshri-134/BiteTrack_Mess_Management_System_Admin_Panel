



// import { supabase } from "../../../lib/db";
// import { verifyToken } from "../../../lib/auth";

// export default async function handler(req, res) {
//   const { id } = req.query;

//   if (req.method !== "PATCH") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   // Extract token → optional
//   let messId = null;
//   try {
//     const decoded = verifyToken(req); // Bearer token
//     messId = decoded.messId;
//   } catch (e) {
//     messId = null; // fallback
//   }

//   try {
//     const { status } = req.body;

//     if (!status) {
//       return res.status(400).json({ error: "Status is required" });
//     }

//     // ---------------------------------------------------------------
//     // CASE 1 → TOKEN PRESENT → update only if user's mess_id matches
//     // ---------------------------------------------------------------
//     if (messId) {
//       // First: verify the booking belongs to this mess
//       const { data: checkRow, error: checkError } = await supabase
//         .from("function_bookings")
//         .select("id, user_id, users:users(mess_id)")
//         .eq("id", id)
//         .single();

//       if (checkError || !checkRow) {
//         return res.status(404).json({ error: "Booking not found" });
//       }

//       if (checkRow.users?.mess_id !== messId) {
//         return res.status(403).json({
//           error: "You are not allowed to update bookings from another mess",
//         });
//       }

//       // Now perform update
//       const { data, error } = await supabase
//         .from("function_bookings")
//         .update({ status, updated_at: new Date().toISOString() })
//         .eq("id", id)
//         .select()
//         .single();

//       if (error) return res.status(400).json({ error: error.message });

//       return res.status(200).json(data);
//     }

//     // ---------------------------------------------------------------
//     // CASE 2 → NO TOKEN → old behavior (unrestricted update)
//     // ---------------------------------------------------------------
//     const { data, error } = await supabase
//       .from("function_bookings")
//       .update({ status, updated_at: new Date().toISOString() })
//       .eq("id", id)
//       .select()
//       .single();

//     if (error) return res.status(400).json({ error: error.message });

//     return res.status(200).json(data);

//   } catch (err) {
//     console.error("❌ Error updating booking:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }

// import { supabase } from "../../../lib/db";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   const { id } = req.query;

//   if (req.method !== "PATCH") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   // ---------------------------------------------------------
//   // 🔐 REQUIRE TOKEN ALWAYS → NO TOKEN = FORCE LOGIN
//   // ---------------------------------------------------------
//   const auth = req.headers.authorization;
//   if (!auth) {
//     return res.status(401).json({ error: "Unauthorized: No token provided" });
//   }

//   let messId = null;
//   try {
//     const token = auth.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     messId = decoded.messId; // your payload must contain mess_id
//   } catch (e) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }

//   try {
//     const { status } = req.body;

//     if (!status) {
//       return res.status(400).json({ error: "Status is required" });
//     }

//     // ---------------------------------------------------------
//     // ✅ Validate booking belongs to same mess
//     // ---------------------------------------------------------
//     const { data: checkRow, error: checkError } = await supabase
//       .from("function_bookings")
//       .select("id, user_id, users:users(mess_id)")
//       .eq("id", id)
//       .single();

//     if (checkError || !checkRow) {
//       return res.status(404).json({ error: "Booking not found" });
//     }

//     if (checkRow.users?.mess_id !== messId) {
//       return res.status(403).json({
//         error: "Forbidden: You cannot update bookings from another mess",
//       });
//     }

//     // ---------------------------------------------------------
//     // 🟢 Update booking
//     // ---------------------------------------------------------
//     const { data, error } = await supabase
//       .from("function_bookings")
//       .update({
//         status,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", id)
//       .select()
//       .single();

//     if (error) return res.status(400).json({ error: error.message });

//     return res.status(200).json(data);

//   } catch (err) {
//     console.error("❌ Error updating booking:", err);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // -------------------------------
    // ⭐ 1. AUTH REQUIRED
    // -------------------------------
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const messId = decoded.messId;
    if (!messId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // -------------------------------
    // ⭐ 2. INPUTS
    // -------------------------------
    const { id } = req.query;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // -------------------------------
    // ⭐ 3. Check booking belongs to this mess
    // -------------------------------
    const checkQuery = `
      SELECT fb.id 
      FROM function_bookings fb
      JOIN users u ON fb.user_id = u.id
      WHERE fb.id = $1 AND u.mess_id = $2
    `;
    const checkResult = await pgPool.query(checkQuery, [id, messId]);

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: "Not allowed for this mess" });
    }

    // -------------------------------
    // ⭐ 4. UPDATE booking
    // -------------------------------
    const updateQuery = `
      UPDATE function_bookings
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pgPool.query(updateQuery, [status, id]);

    return res.status(200).json(rows[0]);

  } catch (err) {
    console.error("❌ Error updating booking:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
