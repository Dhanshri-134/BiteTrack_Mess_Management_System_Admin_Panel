import bcrypt from "bcryptjs";
import dbPkg from "../lib/db.js";
const { pgPool } = dbPkg;

async function hashPasswords() {
  try {
    // Fetch all messes with plain text passwords
    const { rows: messes } = await pgPool.query(
      "SELECT id, password FROM messes"
    );

    console.log(`Found ${messes.length} mess records.`);

    for (const mess of messes) {
      const hashed = await bcrypt.hash(mess.password, 10);

      await pgPool.query(
        "UPDATE messes SET password=$1 WHERE id=$2",
        [hashed, mess.id]
      );

      console.log(`✅ Updated mess id ${mess.id}`);
    }

    console.log("🎉 All passwords hashed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Error hashing passwords:", err);
    process.exit(1);
  }
}

hashPasswords();
