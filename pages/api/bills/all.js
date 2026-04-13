import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";
import {
  getLiveMonthlyBillingRows,
  getUserMonthSourceKeys,
  normalizeMonthNumber,
} from "../../../lib/billingLiveData";

function toMonthStartDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isOnOrAfterJoinMonth({ year, month, joinDate }) {
  const joinMonthStart = toMonthStartDate(joinDate);
  if (!joinMonthStart) return true;

  const rowYear = Number(year);
  const rowMonth = Number(month);
  if (!rowYear || !rowMonth) return false;

  const rowMonthStart = new Date(Date.UTC(rowYear, rowMonth - 1, 1));
  return rowMonthStart >= joinMonthStart;
}

export default async function handler(req, res) {
   res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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

    const { month, year } = req.query;

    const { rows } = await pgPool.query(
      `SELECT *
       FROM billing_view
       WHERE mess_id=$1 AND status='Active'
       ORDER BY year DESC NULLS LAST, month DESC NULLS LAST`,
      [messId]
    );

    let bills = [...rows];

    const { rows: ownerRows } = await pgPool.query(
      `SELECT user_id, att_date
       FROM "Owner_Marked_attendance"
       WHERE mess_id=$1`,
      [messId]
    );

    const ownerMarkedByBill = ownerRows.reduce((acc, row) => {
      const attDate = new Date(row.att_date);
      const key = `${row.user_id}-${attDate.getFullYear()}-${attDate.getMonth() + 1}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(attDate.toISOString().slice(0, 10));
      return acc;
    }, {});

    const { rows: allVerified } = await pgPool.query(
      `SELECT u.id as user_id, u.mess_id, u.name, u.email, COALESCE(u.status, 'Active') as status, u.phone as mobile, p.name as parent_name, p.contact as parent_mobile, u.course, u.hostel_name, u.room_no, u.date_of_joining
       FROM users u
       LEFT JOIN parents p on p.user_id = u.id and p.mess_id = u.mess_id
       WHERE u.mess_id=$1 AND u.verified = true AND COALESCE(u.status, 'Active') = 'Active'`,
      [messId]
    );
    const joinDateByUserId = new Map(
      allVerified.map((user) => [String(user.user_id), user.date_of_joining || null])
    );

    const userIdsInBills = new Set(bills.map(b => b.user_id));
    const existingKeys = new Set(
      bills.map(
        (bill) =>
          `${bill.user_id}-${Number(bill.year)}-${normalizeMonthNumber(bill.month)}`
      )
    );

    const sourceKeys = await getUserMonthSourceKeys(pgPool, messId);
    const allRowKeys = new Set([
      ...Array.from(existingKeys),
      ...sourceKeys.map((row) => `${row.user_id}-${row.year}-${row.month}`),
    ]);

    const monthBuckets = Array.from(allRowKeys).reduce((acc, rowKey) => {
      const [, yearText, monthText] = rowKey.split("-");
      const yearNumber = Number(yearText);
      const monthNumber = Number(monthText);
      const monthKey = `${yearNumber}-${monthNumber}`;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          year: yearNumber,
          month: monthNumber,
          rowKeys: new Set(),
        };
      }

      acc[monthKey].rowKeys.add(rowKey);
      return acc;
    }, {});

    const liveRowsByKey = new Map();

    for (const bucket of Object.values(monthBuckets)) {
      const liveRows = await getLiveMonthlyBillingRows(pgPool, {
        messId,
        month: bucket.month,
        year: bucket.year,
      });

      liveRows.forEach((row) => {
        const rowKey = `${row.user_id}-${row.year}-${row.month}`;
        if (!bucket.rowKeys.has(rowKey)) return;
        liveRowsByKey.set(rowKey, row);

        if (!existingKeys.has(rowKey)) {
          bills.push(row);
          existingKeys.add(rowKey);
          userIdsInBills.add(row.user_id);
        }
      });
    }

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

    const enrichedBills = bills.map((bill) => {
      const normalizedYear = Number(bill.year);
      const normalizedMonth = normalizeMonthNumber(bill.month);
      const rowKey = `${bill.user_id}-${normalizedYear}-${normalizedMonth}`;
      const liveRow = liveRowsByKey.get(rowKey);

      return {
        ...bill,
        ...(liveRow || {}),
        year: normalizedYear,
        month: normalizedMonth,
        attendance_map: liveRow?.attendance_map ?? bill.attendance_map ?? {},
        owner_marked_dates:
          ownerMarkedByBill[rowKey] ||
          liveRow?.owner_marked_dates ||
          bill.owner_marked_dates ||
          [],
      };
    }).filter((bill) =>
      isOnOrAfterJoinMonth({
        year: bill.year,
        month: bill.month,
        joinDate: joinDateByUserId.get(String(bill.user_id)),
      })
    );

    enrichedBills.sort((left, right) => {
      const leftYear = Number(left.year) || 0;
      const rightYear = Number(right.year) || 0;
      if (leftYear !== rightYear) return rightYear - leftYear;

      const leftMonth = normalizeMonthNumber(left.month) || 0;
      const rightMonth = normalizeMonthNumber(right.month) || 0;
      if (leftMonth !== rightMonth) return rightMonth - leftMonth;

      return String(left.name || "").localeCompare(String(right.name || ""));
    });

    return res.status(200).json(enrichedBills);

  } catch (error) {
    console.error("Error fetching bills:", error);
    return res.status(500).json({ error: "Failed to fetch bills" });
  }
}
