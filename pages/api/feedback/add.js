// //pages\api\feedback\add.js
// import { supabase } from "@/lib/supabaseClient";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

//   try {
//     const { user_id, name, email, feedback_type, message } = req.body;

//     const { error } = await supabase.from("feedback").insert([
//       { user_id, name, email, feedback_type, message },
//     ]);

//     if (error) throw error;
//     res.status(200).json({ message: "Feedback submitted successfully!" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to submit feedback" });
//   }
// }





// pages/api/feedback/add.js
import { pgPool } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { user_id, name, email, feedback_type, message } = req.body;

    // 🔐 Extract messId from token
    let mess_id = null;
    try {
      const decoded = verifyToken(req);
      mess_id = decoded?.messId || null;
    } catch (err) {
      console.log("⚠️ No valid token for mess_id, using fallback NULL");
    }

    // 📝 Insert into DB
    const query = `
      INSERT INTO feedback (user_id, name, email, feedback_type, message, mess_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const params = [user_id, name, email, feedback_type, message, mess_id];

    const { rows } = await pgPool.query(query, params);

    res.status(200).json({
      message: "Feedback submitted successfully!",
      feedback: rows[0],
    });
  } catch (err) {
    console.error("❌ Error creating feedback:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
}
