import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 🔐 AUTH
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let messId;
  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    messId = decoded.messId;
    if (!messId) throw new Error();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const client = await pgPool.connect();

  try {
    // ==================================================
    // GET
    // ==================================================
    if (req.method === "GET") {
      const hostels = await client.query(
        `SELECT id, name, is_active, display_order
         FROM hostels
         WHERE mess_id = $1
         ORDER BY display_order, name`,
        [messId]
      );

      const courses = await client.query(
        `SELECT id, name, category, is_active, display_order
         FROM courses
         WHERE mess_id = $1
         ORDER BY display_order, name`,
        [messId]
      );

      return res.status(200).json({
        hostels: hostels.rows,
        courses: courses.rows,
      });
    }

    // ==================================================
    // POST (SAVE)
    // ==================================================
    if (req.method === "POST") {
      const { hostels = [], courses = [] } = req.body;

      await client.query("BEGIN");

      // 🔥 Clear old data
      await client.query("DELETE FROM hostels WHERE mess_id = $1", [messId]);
      await client.query("DELETE FROM courses WHERE mess_id = $1", [messId]);

      // 🏨 Insert hostels
      for (const h of hostels) {
        if (!h.name) continue;
        await client.query(
          `INSERT INTO hostels (name, mess_id, display_order)
           VALUES ($1, $2, $3)`,
          [h.name, messId, h.display_order ?? 0]
        );
      }

      // 🎓 Insert courses
      for (const c of courses) {
        if (!c.name) continue;
        await client.query(
          `INSERT INTO courses (name, category, mess_id, display_order)
           VALUES ($1, $2, $3, $4)`,
          [c.name, c.category || null, messId, c.display_order ?? 0]
        );
      }

      await client.query("COMMIT");

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("🔥 mess/meta error:", err);
    return res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
}
