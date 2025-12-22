// //pages\api\auth\login.js
// import { pgPool } from "../../../lib/db";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.status(400).json({ error: "Email and password required" });
//   }

//   const client = await pgPool.connect();
//   try {
//     const result = await client.query(
//       "SELECT id, name, email, password FROM messes WHERE email = $1",
//       [email]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     const mess = result.rows[0];

//     // ✅ Use bcrypt to check password
//     const isPasswordValid = await bcrypt.compare(password, mess.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     // ✅ Generate JWT token with messId
//     const token = jwt.sign(
//       { messId: mess.id, email: mess.email }, 
//       process.env.JWT_SECRET || "supersecretkey", 
//       { expiresIn: "1d" }
//     );

//     res.status(200).json({
//       token,
//       mess: {
//         id: mess.id,
//         name: mess.name,
//         email: mess.email,
//       },
//     });
//   } catch (err) {
//     console.error("Login error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   } finally {
//     client.release();
//   }
// }
import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {

   res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
 
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pgPool.query(
      "SELECT id, name, email, password FROM messes WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const mess = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, mess.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { messId: mess.id, email: mess.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      token,
      mess: {
        id: mess.id,
        name: mess.name,
        email: mess.email,
      },
    });

  } catch (err) {
    console.error("LOGIN API ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
