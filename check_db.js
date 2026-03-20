const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.vhnhtypxvpwagghunnjr:ShrisTech123@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  const result = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name IN ('messes', 'users', 'billing_details', 'parents');
  `);
  
  const tables = {};
  for(const row of result.rows) {
    if(!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(row.column_name);
  }
  
  console.log("MESSES columns:", tables['messes'].filter(c => c.includes('price') || c.includes('rate')));
  console.log("USERS columns:", tables['users'].filter(c => c.includes('parent') || c.includes('rate')));
  console.log("PARENTS columns:", tables['parents']);
  console.log("BILLING_DETAILS columns:", tables['billing_details']);
  
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
