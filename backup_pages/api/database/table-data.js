import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { table } = req.query;
  
  if (!table) {
    return res.status(400).json({ error: "Table name is required" });
  }

  // Validate table name to prevent SQL injection
  const validTableName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table);
  if (!validTableName) {
    return res.status(400).json({ error: "Invalid table name" });
  }

  const client = await pgPool.connect();
  
  try {
    // Get column information
    const columnResult = await client.query(`
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);

    const columns = columnResult.rows;

    // Get table data (limit to 1000 rows for performance)
    const dataResult = await client.query(`
      SELECT * FROM "${table}" 
      ORDER BY 1 
      LIMIT 1000
    `);

    const data = dataResult.rows;

    res.status(200).json({ 
      columns,
      data,
      count: data.length 
    });
  } catch (err) {
    console.error("Error fetching table data:", err);
    res.status(500).json({ error: `Failed to fetch data from table: ${table}` });
  } finally {
    client.release();
  }
}