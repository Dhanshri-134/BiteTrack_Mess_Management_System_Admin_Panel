// import { pgPool } from '../../../lib/db';

// export default async function handler(req, res) {
//   if (req.method !== 'POST') return res.status(405).end();

//   const { userId, email } = req.body;
//   if (!userId || !email) return res.status(400).json({ error: 'Missing fields' });

//   const client = await pgPool.connect();
//   try {
//     await client.query('BEGIN');

//     // Generate 6-digit verification code
//     const code = Math.floor(100000 + Math.random() * 900000).toString();
//     const now = new Date();
//     const expiresAt = new Date(now.setMonth(now.getMonth() + 1));

//     // Insert code into verification_codes table
//     await client.query(
//       `INSERT INTO verification_codes (user_id, code, expires_at)
//        VALUES ($1, $2, $3)`,
//       [userId, code, expiresAt]
      
//     );

//     await client.query(
//     `UPDATE users SET mail_sent = true WHERE id = $1`,
//     [userId]
//   );


//     await client.query('COMMIT');

//     // Send email using Brevo API
//     const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
//       method: 'POST',
//       headers: {
//         'accept': 'application/json',
//         'api-key': process.env.BREVO_API_KEY,
//         'content-type': 'application/json',
//       },
//       body: JSON.stringify({
//         sender: { email: process.env.EMAIL_FROM },
//         to: [{ email }],
//         subject: 'Verification for Sanskruti Mess and Kitchen Registration',
//         // htmlContent: `<p>Your verification code is: <b>${code}</b></p>`,
//         htmlContent: `
//   <p>Dear Student,</p>

//   <p>Thank you for completing the first step of your registration for <b>Sanskruti Mess and Kitchen</b> under the <b>BiteTrack (by Shris Tech)</b> system.</p>

//   <p>To secure your registration and generate your QR Code (<b>compulsory from 1st October for mess entry</b>), please complete the following step:</p>

//   <p>🔑 <b>Your verification Code:</b> <span style="font-size:16px; color:#2b6cb0;">${code}</span></p>

//   <p>👉 Click the WhatsApp link below and send us your <b>Registered Email ID + Code</b>:</p>
//   <p><a href="https://wa.me/message/5MFG4WYWVOZTM1" target="_blank">
//     https://wa.me/message/5MFG4WYWVOZTM1
//   </a></p>

//   <p>This step is necessary to:</p>
//   <ul>
//     <li>✅ Verify your email ID securely</li>
//     <li>✅ Complete your registration process</li>
//     <li>✅ Receive your unique QR Code (used for entry from 1st October)</li>
//   </ul>

//   <p><b>⚠ Note:</b> QR Code will only be issued after email verification. Please complete this process within the same day.</p>

//   <p>Thank you for your quick cooperation,<br/>
//   <b>Sanskruti Mess and Kitchen</b> | Powered by <b>BiteTrack – Shris Tech</b></p>
// `

//       }),
//     });

//     const data = await resp.json();
//     console.log('Brevo response:', data);

//     if (!resp.ok) throw new Error(`Brevo API error: ${JSON.stringify(data)}`);

//     res.json({ ok: true, message: 'Verification code sent' });
//   } catch (err) {
//     await client.query('ROLLBACK');
//     console.error(err);
//     res.status(500).json({ error: 'internal', details: err.message });
//   } finally {
//     client.release();
//   }
// }



import { pgPool } from '../../../lib/db';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = authHeader.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;
  if (!messId) return res.status(400).json({ error: "messId missing in token" });

  const { userId, email } = req.body;
  if (!userId || !email) return res.status(400).json({ error: "Missing fields" });

  const client = await pgPool.connect();
  try {
    // Check if user belongs to the mess
    const userCheck = await client.query(
      `SELECT id FROM users WHERE id = $1 AND mess_id = $2`,
      [userId, messId]
    );
    if (userCheck.rows.length === 0) {
      return res.status(403).json({ error: "User not authorized" });
    }

    await client.query('BEGIN');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await client.query(
      `INSERT INTO verification_codes (user_id, code, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, code, expiresAt]
    );

    await client.query(
      `UPDATE users SET mail_sent = true WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    // Send email via Brevo
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM },
        to: [{ email }],
        subject: 'Verification for Sanskruti Mess and Kitchen Registration',
        htmlContent: `<p>Your verification code is: <b>${code}</b></p>`
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(`Brevo API error: ${JSON.stringify(data)}`);

    res.json({ ok: true, message: 'Verification code sent' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'internal', details: err.message });
  } finally {
    client.release();
  }
}
