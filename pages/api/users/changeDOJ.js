
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT,OPTIONS');
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
