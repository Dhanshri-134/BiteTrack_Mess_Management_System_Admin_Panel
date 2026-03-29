import jwt from "jsonwebtoken";
import { pgPool } from "@/lib/db";

function parseCurrency(value) {
  const numeric = String(value ?? "").replace(/[^0-9.]/g, "").trim();
  return Number(numeric || 0);
}

function toDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getOverlapDays(start, end) {
  if (!start || !end || start > end) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const messId = decoded.messId;

    if (!messId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [{ rows: messRows }, { rows: accessRows }, { rows: userRows }] =
      await Promise.all([
        pgPool.query(
          `SELECT per_day_rate, monthly_price
           FROM messes
           WHERE id = $1
           LIMIT 1`,
          [messId]
        ),
        pgPool.query(
          `SELECT per_day_rate
           FROM mess_access
           WHERE mess_id = $1
           LIMIT 1`,
          [messId]
        ),
        pgPool.query(
          `SELECT
             id,
             date_of_joining,
             status,
             freeze_date,
             unfreeze_date
           FROM users
           WHERE mess_id = $1
             AND verified = TRUE`,
          [messId]
        ),
      ]);

    const mess = messRows[0] || {};
    const access = accessRows[0] || {};
    const perDayRate = Number(mess.per_day_rate || 0);
    const monthlyRate = parseCurrency(mess.monthly_price);
    const usePerDayBilling = Boolean(access.per_day_rate);

    let activeUsers = 0;
    let expectedAmount = 0;

    for (const user of userRows) {
      const joinDate = toDateOnly(user.date_of_joining) || monthStart;
      const unfreezeDate = toDateOnly(user.unfreeze_date);
      const freezeDate = toDateOnly(user.freeze_date);
      const status = String(user.status || "Active").toLowerCase();

      let activeStart = joinDate > monthStart ? joinDate : monthStart;
      let activeEnd = monthEnd;

      if (unfreezeDate && unfreezeDate > activeStart) {
        activeStart = unfreezeDate;
      }

      if (freezeDate && freezeDate < activeEnd) {
        activeEnd = freezeDate;
      }

      if (status === "inactive" && freezeDate && freezeDate <= monthStart) {
        activeEnd = freezeDate;
      }

      const overlapDays = getOverlapDays(activeStart, activeEnd);
      if (overlapDays <= 0) {
        continue;
      }

      activeUsers += 1;
      expectedAmount += usePerDayBilling
        ? overlapDays * perDayRate
        : monthlyRate;
    }

    return res.status(200).json({
      active_users: activeUsers,
      billing_mode: usePerDayBilling ? "daily" : "monthly",
      per_day_rate: perDayRate,
      monthly_rate: monthlyRate,
      expected_amount: Number(expectedAmount.toFixed(2)),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
  } catch (error) {
    console.error("Expected payment error:", error);
    return res.status(500).json({ error: "Failed to calculate expected payment" });
  }
}
