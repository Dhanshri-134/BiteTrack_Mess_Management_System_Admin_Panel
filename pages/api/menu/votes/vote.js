import { pgPool } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { dishId } = req.body;
  try {
    await pgPool.query("UPDATE special_dishes SET votes = votes + 1 WHERE id = $1", [dishId]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Voting failed" });
  }
}
