import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const { id, email, password } = req.body;
  if (!id) {
    return res.status(400).json({ ok: false, message: "Missing staff ID" });
  }

  try {
    const query = `
      UPDATE staff
      SET email = $1,
          password = crypt($2, gen_salt('bf')),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id;
    `;
    const result = await pgPool.query(query, [email, password, id]);

    if (result.rowCount > 0) {
      res
        .status(200)
        .json({ ok: true, message: "✅ Staff credentials updated." });
    } else {
      res
        .status(404)
        .json({ ok: false, message: "❌ Staff not found or no changes made." });
    }
  } catch (err) {
    console.error("Error updating staff credentials:", err);
    res.status(500).json({ ok: false, message: "Internal server error." });
  }
}
