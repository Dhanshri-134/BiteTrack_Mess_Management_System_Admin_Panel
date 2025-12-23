// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "PUT") return res.status(405).end();

//   const { id, date_of_joining } = req.body;

//   if (!id || !date_of_joining)
//     return res.status(400).json({ error: "Missing user ID or date_of_joining" });

//   console.log("Updating first attendance date for user:", id, date_of_joining);

//   try {
//     // Find the first (earliest) attendance record for this user
//     const firstRecord = await pgPool.query(
//       `
//       SELECT id
//       FROM monthly_attendance
//       WHERE user_id = $1
//       ORDER BY first_attendance_date ASC
//       LIMIT 1;
//       `,
//       [id]
//     );

//     if (firstRecord.rows.length === 0) {
//       return res.status(404).json({
//         error: "No attendance record found for this user.",
//       });
//     }

//     const attendanceId = firstRecord.rows[0].id;

//     // Update that earliest attendance record’s date
//     const updated = await pgPool.query(
//       `
//       UPDATE monthly_attendance
//       SET first_attendance_date = $2
//       WHERE id = $1
//       RETURNING *;
//       `,
//       [attendanceId, date_of_joining]
//     );

//     res.status(200).json({
//       ok: true,
//       message: "First attendance date updated successfully.",
//       record: updated.rows[0],
//     });
//   } catch (err) {
//     console.error("Error updating first attendance date:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PUT") return res.status(405).end();

  const { id, date_of_joining } = req.body;

  if (!id || !date_of_joining)
    return res.status(400).json({ error: "Missing user ID or date_of_joining" });

  console.log("Updating first attendance date and DOJ for user:", id, date_of_joining);

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN"); // ✅ start transaction


    // 3️⃣ Update user's date_of_joining
    const updatedUser = await client.query(
      `
      UPDATE users
      SET date_of_joining = $2
      WHERE id = $1
      RETURNING *;
      `,
      [id, date_of_joining]
    );

    await client.query("COMMIT"); 

    res.status(200).json({
      ok: true,
      message: "Date of joining and first attendance date updated successfully.",
      
      user: updatedUser.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating first attendance date and DOJ:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
