import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    // ✅ TOKEN REQUIRED
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ VERIFY JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const messId = decoded.messId;

    if (!messId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // 🔥 ORIGINAL LOGIC (UNCHANGED)
    const { rows: bills } = await pgPool.query(
      `SELECT *
       FROM billing_view
       WHERE mess_id=$1
       ORDER BY year DESC NULLS LAST, month DESC NULLS LAST`,
      [messId]
    );

    const { rows: allVerified } = await pgPool.query(
      `SELECT u.id as user_id, u.mess_id, u.name, u.email, COALESCE(u.status, 'Active') as status, u.phone as mobile, p.name as parent_name, p.contact as parent_mobile, u.course, u.hostel_name, u.room_no
       FROM users u
       LEFT JOIN parents p on p.user_id = u.id and p.mess_id = u.mess_id
       WHERE u.mess_id=$1 AND u.verified = true`,
      [messId]
    );

    const userIdsInBills = new Set(bills.map(b => b.user_id));
    
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

    return res.status(200).json(bills);

  } catch (error) {
    console.error("Error fetching bills:", error);
    return res.status(500).json({ error: "Failed to fetch bills" });
  }
}