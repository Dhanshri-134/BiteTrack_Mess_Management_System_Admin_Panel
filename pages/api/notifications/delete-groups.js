// pages/api/notifications/delete-group.js
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: "No IDs provided" });

  try {
    await pgPool.query(`DELETE FROM notifications WHERE id = ANY($1::int[])`, [ids]);
    return res.status(200).json({ message: "Deleted group" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
