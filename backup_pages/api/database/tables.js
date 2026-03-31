import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const client = await pgPool.connect();
  
  try {
    // Get all tables from the public schema
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = result.rows.map(row => row.table_name);

    res.status(200).json({ tables });
  } catch (err) {
    console.error("Error fetching tables:", err);
    res.status(500).json({ error: "Failed to fetch tables" });
  } finally {
    client.release();
  }
}