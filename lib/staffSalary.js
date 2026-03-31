import { pgPool } from "@/lib/db";

function getPaymentStatus(finalSalary, totalPaid, hasSalaryRow = true) {
  if (!hasSalaryRow) return "not_added";
  if (finalSalary <= 0) return "paid";
  if (totalPaid > 0) return "partial";
  return "pending";
}

function isCurrentPeriod(month, year) {
  const now = new Date();
  return Number(month) === now.getMonth() + 1 && Number(year) === now.getFullYear();
}

async function getTotalPaidForPeriod({ messId, staffId, month, year }) {
  const payments = await pgPool.query(
    `SELECT COALESCE(SUM(amount),0) AS total_paid
     FROM staff_payments
     WHERE mess_id=$1
       AND staff_id=$2
       AND EXTRACT(MONTH FROM payment_date)=$3
       AND EXTRACT(YEAR FROM payment_date)=$4`,
    [messId, staffId, month, year]
  );

  return Number(payments.rows[0]?.total_paid || 0);
}

async function syncCurrentBalance({ messId, staffId, month, year, finalSalary }) {
  if (!isCurrentPeriod(month, year)) return;

  await pgPool.query(
    `UPDATE staff
     SET current_balance=$1,
         updated_at=NOW()
     WHERE id=$2
       AND mess_id=$3`,
    [finalSalary, staffId, messId]
  );
}

export async function upsertManualStaffSalary({
  messId,
  staffId,
  month,
  year,
  baseSalary,
  overtimeAmount = 0,
  penaltyAmount = 0,
}) {
  if (!messId || !staffId || !month || !year) {
    throw new Error("messId, staffId, month and year are required");
  }

  const totalPaid = await getTotalPaidForPeriod({ messId, staffId, month, year });
  const manualBaseSalary = Number(baseSalary || 0);
  const overtime = Number(overtimeAmount || 0);
  const penalty = Number(penaltyAmount || 0);
  const grossSalary = Number((manualBaseSalary + overtime - penalty).toFixed(2));
  const finalSalary = Number((grossSalary - totalPaid).toFixed(2));
  const paymentStatus = getPaymentStatus(finalSalary, totalPaid, true);

  const result = await pgPool.query(
    `INSERT INTO staff_salary
     (
       staff_id,
       mess_id,
       month,
       year,
       present_days,
       late_days,
       base_salary,
       overtime_amount,
       penalty_amount,
       final_salary,
       payment_status
     )
     VALUES($1,$2,$3,$4,0,0,$5,$6,$7,$8,$9)
     ON CONFLICT (staff_id,month,year)
     DO UPDATE SET
       base_salary=EXCLUDED.base_salary,
       overtime_amount=EXCLUDED.overtime_amount,
       penalty_amount=EXCLUDED.penalty_amount,
       final_salary=EXCLUDED.final_salary,
       payment_status=EXCLUDED.payment_status
     RETURNING *`,
    [
      staffId,
      messId,
      month,
      year,
      manualBaseSalary,
      overtime,
      penalty,
      finalSalary,
      paymentStatus,
    ]
  );

  await syncCurrentBalance({
    messId,
    staffId,
    month,
    year,
    finalSalary,
  });

  return {
    ...result.rows[0],
    total_paid: totalPaid,
    gross_salary: grossSalary,
  };
}

export async function refreshManualStaffSalary({ messId, staffId, month, year }) {
  if (!messId || !staffId || !month || !year) {
    throw new Error("messId, staffId, month and year are required");
  }

  const existingSalary = await pgPool.query(
    `SELECT base_salary, overtime_amount, penalty_amount
     FROM staff_salary
     WHERE mess_id=$1
       AND staff_id=$2
       AND month=$3
       AND year=$4
     LIMIT 1`,
    [messId, staffId, month, year]
  );

  if (existingSalary.rowCount === 0) {
    return null;
  }

  return upsertManualStaffSalary({
    messId,
    staffId,
    month,
    year,
    baseSalary: existingSalary.rows[0].base_salary,
    overtimeAmount: existingSalary.rows[0].overtime_amount,
    penaltyAmount: existingSalary.rows[0].penalty_amount,
  });
}

export async function seedManualSalaryRows({ messId, month, year }) {
  if (!messId || !month || !year) {
    throw new Error("messId, month and year are required");
  }

  const staff = await pgPool.query(
    `SELECT id, base_salary
     FROM staff
     WHERE mess_id=$1 AND is_active=true
     ORDER BY name`,
    [messId]
  );

  const created = [];

  for (const staffRow of staff.rows) {
    const existing = await pgPool.query(
      `SELECT id
       FROM staff_salary
       WHERE mess_id=$1
         AND staff_id=$2
         AND month=$3
         AND year=$4
       LIMIT 1`,
      [messId, staffRow.id, month, year]
    );

    if (existing.rowCount > 0) continue;

    const salaryRow = await upsertManualStaffSalary({
      messId,
      staffId: staffRow.id,
      month,
      year,
      baseSalary: Number(staffRow.base_salary || 0),
      overtimeAmount: 0,
      penaltyAmount: 0,
    });

    created.push(salaryRow);
  }

  return created;
}
