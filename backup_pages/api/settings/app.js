import { pgPool } from "@/lib/db";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "Method not allowed",
    });
  }

  try {
    const { rows } = await pgPool.query(`
      SELECT setting_key, setting_value
      FROM bitetrack_settings
      WHERE setting_key IN (
        'privacy_policy',
        'terms_conditions',
        'account_deletion',
        'about_bitetrack',
        'contact_support'
      )
    `);

    const result = {};
    for (const row of rows) {
      result[row.setting_key] = row.setting_value;
    }

    return res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    console.error("❌ app-settings error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to load app settings",
    });
  }
}
