// import { pgPool } from '../../lib/db';


// export default async function handler(req, res) {
// if (req.method !== 'POST') return res.status(405).end();


// const { name, email, phone, mess_id } = req.body;
// if (!name || !email) return res.status(400).json({ error: 'Missing fields' });


// const client = await pgPool.connect();
// try {
// await client.query('BEGIN');


// const insert = await client.query(
// `INSERT INTO users (name, email, phone, mess_id)
// VALUES ($1,$2,$3,$4)
// ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
// RETURNING id`,
// [name, email, phone || null, mess_id || 1]
// );


// const userId = insert.rows[0].id;
// const code = Math.floor(100000 + Math.random() * 900000).toString();
// const expiresAt = new Date(Date.now() + 1000 * 60 * 60);


// await client.query(
// `INSERT INTO verification_codes (user_id, code, expires_at)
// VALUES ($1,$2,$3)`,
// [userId, code, expiresAt]
// );


// await client.query('COMMIT');


// // Send email using Brevo API (no nodemailer needed)
// const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
//   method: 'POST',
//   headers: {
//     'accept': 'application/json',
//     'api-key': process.env.BREVO_API_KEY,
//     'content-type': 'application/json'
//   },
//   body: JSON.stringify({
//     sender: { email: process.env.EMAIL_FROM },
//     to: [{ email }],
//     subject: 'Your Verification Code',
//     htmlContent: `<p>Your verification code is: <b>${code}</b></p>`
//   })
// });

// const data = await resp.json();
// console.log('Brevo response:', data);

// if (!resp.ok) {
//   throw new Error(`Brevo API error: ${JSON.stringify(data)}`);
// }



// res.json({ ok: true });
// } catch (err) {
// await client.query('ROLLBACK');
// console.error(err);
// res.status(500).json({ error: 'internal' });
// } finally {
// client.release();
// }
// }



import { pgPool } from '../../lib/db';
import { verifyToken } from '../../lib/auth';   // ⬅️ using your existing token verify

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, mess_id: bodyMessId } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing fields' });

  // ⬅️ Extract mess_id from token (if token exists)

  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized: token required" });
  }

  let decoded;
  try {
    const token = auth.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.warn("Invalid token:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const messId = decoded.messId;

  // FINAL mess_id logic
  // priority: token → frontend → default(1)
  const finalMessId = tokenMessId || bodyMessId || 1;

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    const insert = await client.query(
      `INSERT INTO users (name, email, phone, mess_id,mail_sent)
       VALUES ($1,$2,$3,$4,TRUE)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id`,
      [name, email, phone || null, 5]
    );

    const userId = insert.rows[0].id;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await client.query(
      `INSERT INTO verification_codes (user_id, code, expires_at)
        VALUES ($1,$2,$3)`,
      [userId, code, expiresAt]
    );

    await client.query('COMMIT');

    // 🎯 Send email via Brevo
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM },
        to: [{ email }],
        subject: 'Your Verification Code',
        htmlContent: `<p>Your verification code is: <b>${code}</b></p>`
      })
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(`Brevo API error: ${JSON.stringify(data)}`);

    return res.json({ ok: true });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'internal' });
  } finally {
    client.release();
  }
}
