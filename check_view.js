const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: "postgresql://postgres.vhnhtypxvpwagghunnjr:ShrisTech123@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
});

async function run() {
  try {
    const res = await pool.query("SELECT pg_get_viewdef('billing_view', true) AS view_def;");
    fs.writeFileSync('view_def.txt', res.rows[0].view_def);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
