// import { pgPool } from "../../lib/db";
// import QRCode from "qrcode";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   const { email, code } = req.body;
//   if (!email || !code) return res.status(400).json({ error: "Missing fields" });

//   const client = await pgPool.connect();
//   try {
//     await client.query("BEGIN");

//     const userRes = await client.query(
//       `SELECT u.id, u.name, u.email, u.mess_id
//        FROM users u
//        JOIN verification_codes v
//        ON u.id = v.user_id
//        WHERE u.email=$1 AND v.code=$2 AND v.expires_at > now()`,
//       [email, code]
//     );

//     if (userRes.rows.length === 0) {
//       await client.query("ROLLBACK");
//       return res.status(400).json({ error: "Invalid or expired code" });
//     }

//     const user = userRes.rows[0];

//     await client.query(`UPDATE users SET verified=true WHERE id=$1`, [user.id]);
//     await client.query(`DELETE FROM verification_codes WHERE user_id=$1`, [user.id]);

//     await client.query("COMMIT");

//     // Generate QR code as "messId-userId"
//     const qrText = `${user.mess_id}-${user.id}`;
//     const qrBuffer = await QRCode.toBuffer(qrText);
//     const qrBase64 = qrBuffer.toString("base64");

//     // Send email via Brevo HTTP API (example)
//     const BREVO_API_KEY = process.env.BREVO_API_KEY;
//     const EMAIL_FROM = process.env.EMAIL_FROM;

//     await fetch("https://api.brevo.com/v3/smtp/email", {
//       method: "POST",
//       headers: {
//         "accept": "application/json",
//         "content-type": "application/json",
//         "api-key": BREVO_API_KEY,
//       },
//       body: JSON.stringify({
//         sender: { email: EMAIL_FROM },
//         to: [{ email: user.email, name: user.name }],
//         subject: "Your QR Code for Mess Management",
//         // htmlContent: `
//         //   <p>Hi ${user.name},</p>
//         //   <p>Your email is verified successfully! Use this QR code for mess entry:</p>
//         //   <p><img src="cid:qrcode"></p>
//         // `,
//         htmlContent: `
//   <p>Dear ${user.name},</p>

//   <p>Thank you for completing your registration process with <b>Sanskruti Mess and Kitchen</b> under the <b>BiteTrack (by Shris Tech)</b> system. 🎉</p>

//   <p>✅ <b>Your registration is now complete.</b><br/>
//   Attached/embedded in this email is your unique QR Code.</p>

//   <p><b>📌 Usage of QR Code:</b></p>
//   <ul>
//     <li>This QR Code will be required for <b>daily mess entry & attendance</b> starting from <b>1st October</b>.</li>
//     <li>Please keep it safe (save it on your phone or take a printout).</li>
//     <li>Do not share your QR Code with others — it is unique to you.</li>
//   </ul>

//   <p><b>⚠ Reminder:</b><br/>
//   If any of your friends have not yet completed the registration process, kindly remind them to do so before <b>30th September</b>, as QR-based entry will start from <b>1st October</b>.</p>

//   <p>🙏 Thank you for your cooperation and support in making this process smooth and digital.</p>

 

//   <p>Best Regards,<br/>
//   <b>Sanskruti Mess and Kitchen</b><br/>
//   Powered by <b>BiteTrack – Shris Tech</b></p>
// `,
//         attachment: [
//           {
//             content: qrBase64,
//             name: "qrcode.png",
//             type: "image/png",
//             disposition: "inline",
//             contentId: "qrcode"
//           }
//         ]
//       }),
//     });

//     return res.json({ ok: true, message: "Verified & QR sent via email!" });
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error("Error: ",err);
//     return res.status(500).json({ error: "Internal server error" });
//   } finally {
//     client.release();
//   }
// }




import { pgPool } from "../../lib/db";
import QRCode from "qrcode";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Missing fields" });

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT u.id, u.name, u.email, u.mess_id
       FROM users u
       JOIN verification_codes v
       ON u.id = v.user_id
       WHERE u.email=$1 AND v.code=$2 AND v.expires_at > now()`,
      [email, code]
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const user = userRes.rows[0];

    await client.query(`UPDATE users SET verified=true WHERE id=$1`, [user.id]);
    await client.query(`DELETE FROM verification_codes WHERE user_id=$1`, [user.id]);

    await client.query("COMMIT");

    // Generate QR code as "messId-userId"
    const qrText = `${user.mess_id}-${user.id}`;
    const qrBuffer = await QRCode.toBuffer(qrText);
    const qrBase64 = qrBuffer.toString("base64");

    // Send email via Brevo HTTP API
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const EMAIL_FROM = process.env.EMAIL_FROM;

    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: EMAIL_FROM },
        to: [{ email: user.email, name: user.name }],
        subject: "Your QR Code for Mess Management",

        htmlContent: `
  <p>Dear ${user.name},</p>

  <p>Thank you for completing your registration process with 
  <b>Sanskruti Mess and Kitchen</b> under the <b>BiteTrack (by Shris Tech)</b> system. 🎉</p>

  <p>✅ <b>Your registration is now complete.</b><br/>
  Your unique QR Code is attached below.</p>

  <p><b>📌 Usage of QR Code:</b></p>
  <ul>
    <li>Required for <b>daily mess entry & attendance</b> starting from <b>1st October</b>.</li>
    <li>Please keep it safe.</li>
    <li>Do not share your QR Code with others.</li>
  </ul>

  <p><b>⚠ Reminder:</b><br/>
  If any of your friends have not yet completed the registration, remind them before <b>30th September</b>.</p>

  <p>🙏 Thank you for your cooperation.</p>

  <p>Best Regards,<br/>
  <b>Sanskruti Mess and Kitchen</b><br/>
  Powered by <b>BiteTrack – Shris Tech</b></p>
        `,

        // ⬇⬇⬇ FIXED ONLY THIS PART ⬇⬇⬇
        attachment: [
          {
            content: qrBase64,
            name: "qrcode.png",
            type: "image/png",
          },
        ],
        // ⬆⬆⬆ NO INLINE, NO contentId – JSON MODE SUPPORTS ONLY ATTACHMENTS ⬆⬆⬆
      }),
    });

    return res.json({ ok: true, message: "Verified & QR sent via email!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error: ", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
