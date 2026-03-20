const { Pool } = require('pg');

const fs = require('fs');

const code = `import { verifyToken } from "../../../lib/auth";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const messId = decoded.messId;

  try {
    const { rows: bills } = await pgPool.query(
      \`SELECT *
       FROM billing_view
       WHERE mess_id=$1
       ORDER BY year DESC NULLS LAST, month DESC NULLS LAST\`,
      [messId]
    );

    const { rows: allVerified } = await pgPool.query(
      \`SELECT u.id as user_id, u.mess_id, u.name, u.email, COALESCE(u.status, 'Active') as status, u.phone as mobile, p.name as parent_name, p.contact as parent_mobile, u.course, u.hostel_name, u.room_no
       FROM users u
       LEFT JOIN parents p on p.user_id = u.id and p.mess_id = u.mess_id
       WHERE u.mess_id=$1 AND u.verified = true\`,
      [messId]
    );

    const userIdsInBills = new Set(bills.map(b => b.user_id));
    
    // Inject verified users who don't have any billing records yet
    const now = new Date();
    allVerified.forEach(u => {
      if (!userIdsInBills.has(u.user_id)) {
        bills.push({
          ...u,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          days_billed: 0,
          attendance_map: {},
          chosen_per_day_rate: 0,
          monthly_price: '₹0',
          total_amount: 0,
          advance_amount: 0,
          paid: false,
          note: null,
          owner_marked_dates: []
        });
      }
    });

    res.status(200).json(bills);
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ error: "Failed to fetch bills" });
  }
}
`;

fs.writeFileSync('pages/api/bills/all.js', code);
