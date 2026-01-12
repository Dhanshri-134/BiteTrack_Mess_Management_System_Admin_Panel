import { pgPool } from "../../../lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // 1️⃣ Fetch mess
    const result = await pgPool.query(
      `
      SELECT
        id,
        name,
        email,
        password,
        subscription_status,
        trial_end_date
      FROM messes
      WHERE email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const mess = result.rows[0];

    // 2️⃣ Verify password
    const validPassword = await bcrypt.compare(password, mess.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 3️⃣ Subscription guard (SaaS rule)
    if (!["trial", "active"].includes(mess.subscription_status)) {
      return res.status(402).json({
        error: "Subscription inactive. Please renew to continue.",
      });
    }

    // 4️⃣ JWT (SaaS-safe)
    const token = jwt.sign(
      {
        messId: mess.id,
        role: "MESS_ADMIN", // implicit admin
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      mess: {
        id: mess.id,
        name: mess.name,
        email: mess.email,
        subscription_status: mess.subscription_status,
        trial_end_date: mess.trial_end_date,
      },
    });
  } catch (err) {
    console.error("LOGIN API ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}



// import { pgPool } from "../../../lib/db";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";

// export default async function handler(req, res) {

//    res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }
 
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }


//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ error: "Email and password required" });
//     }

//     const result = await pgPool.query(
//       "SELECT id, name, email, password FROM messes WHERE email = $1",
//       [email]
//     );

//     if (result.rows.length === 0) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     const mess = result.rows[0];

//     const isPasswordValid = await bcrypt.compare(password, mess.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ error: "Invalid email or password" });
//     }

//     const token = jwt.sign(
//       { messId: mess.id, email: mess.email },
//       process.env.JWT_SECRET,
//     );

//     return res.status(200).json({
//       token,
//       mess: {
//         id: mess.id,
//         name: mess.name,
//         email: mess.email,
//       },
//     });

//   } catch (err) {
//     console.error("LOGIN API ERROR:", err);
//     return res.status(500).json({ error: err.message });
//   }
// }
