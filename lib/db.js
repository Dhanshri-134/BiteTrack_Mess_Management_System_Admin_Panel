import { Pool } from "pg";

let pool;

export function getPgPool() {
  if (pool) return pool;

  try {
    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: {
        rejectUnauthorized: false, // required for Supabase hosted DB
      },
    });
    console.log("✅ Connected via SUPABASE_DB_URL");
  } catch (err) {
    console.error("❌ Failed to connect with SUPABASE_DB_URL:", err.message);

    if (!process.env.SUPABASE_DB_IP_URL) {
      throw new Error("No fallback IP URL provided");
    }

    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_IP_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    console.log("✅ Connected via SUPABASE_DB_IP_URL");
  }

  return pool;
}


// Optional shortcut (if you just want a direct import)
export const pgPool = getPgPool();
