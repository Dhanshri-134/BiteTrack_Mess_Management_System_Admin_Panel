import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  try {
    if (req.method === "GET") {
      // Fetch mess info
      const query = `
        SELECT 
          id,
          name
        FROM messes
        LIMIT 1;
      `;
      const { rows } = await pgPool.query(query);
      return res.status(200).json(rows[0] || {});
    }

    if (req.method === "POST") {
      const {
        id,
        name,
      } = req.body;

      if (!name || !contact) {
        return res
          .status(400)
          .json({ ok: false, message: "Missing required fields." });
      }

      const query = `
        INSERT INTO mess_info (
          id,
          name,
          contact,
          address,
          description,
          rules,
          policies,
          features,
          functionalities,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          name = EXCLUDED.name,
          contact = EXCLUDED.contact,
          address = EXCLUDED.address,
          description = EXCLUDED.description,
          rules = EXCLUDED.rules,
          policies = EXCLUDED.policies,
          features = EXCLUDED.features,
          functionalities = EXCLUDED.functionalities,
          updated_at = NOW()
        RETURNING id;
      `;

      const values = [
        id || 1,
        name,
        contact,
        address,
        description,
        rules,
        policies,
        features,
        functionalities,
      ];

      const result = await pgPool.query(query, values);
      return res
        .status(200)
        .json({
          ok: true,
          id: result.rows[0].id,
          message: "Mess info updated successfully.",
        });
    }

    return res
      .status(405)
      .json({ ok: false, message: "Method not allowed." });
  } catch (error) {
    console.error("Error in /api/settings/messInfo:", error);
    res
      .status(500)
      .json({ ok: false, message: "Internal server error." });
  }
}
