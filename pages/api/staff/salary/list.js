import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";
import { generateStaffSalaryForPeriod } from "@/lib/staffSalary";

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS"){
return res.status(200).end();
}

if(req.method!=="POST"){
return res.status(405).json({error:"Method not allowed"});
}

try{

const token=req.headers.authorization?.split(" ")[1];
if(!token){
return res.status(401).json({error:"Token required"});
}

const decoded=jwt.verify(token,process.env.JWT_SECRET);

const messId=decoded.messId;

const {month,year}=req.body;

await generateStaffSalaryForPeriod({ messId, month, year });

const result=await pgPool.query(
`SELECT
ss.id,
ss.staff_id,
s.name,
s.phone,
s.role,
s.salary_type,
s.base_salary AS configured_base_salary,
ss.base_salary AS earned_base_salary,
ss.base_salary,
ss.overtime_amount,
ss.penalty_amount,
COALESCE(a.present_days, 0) AS present_days,
COALESCE(a.leave_days, 0) AS leave_days,
COALESCE(a.half_days, 0) AS half_days,
COALESCE(a.absent_days, 0) AS absent_days,
COALESCE(a.off_days, 0) AS off_days,
COALESCE(a.payable_units, 0) AS payable_units,
COALESCE(a.total_work_minutes, 0) AS total_work_minutes,
ss.base_salary + ss.overtime_amount - ss.penalty_amount AS gross_salary,
GREATEST((ss.base_salary + ss.overtime_amount - ss.penalty_amount) - COALESCE(p.total_paid,0), 0) AS final_salary,
CASE
WHEN (ss.base_salary + ss.overtime_amount - ss.penalty_amount) - COALESCE(p.total_paid,0) <= 0 THEN 'paid'
WHEN COALESCE(p.total_paid,0) > 0 THEN 'partial'
ELSE 'pending'
END AS payment_status,
COALESCE(p.total_paid,0) AS total_paid,
p.payments
FROM staff_salary ss
JOIN staff s ON s.id=ss.staff_id
LEFT JOIN (
SELECT
staff_id,
mess_id,
EXTRACT(MONTH FROM attendance_date) AS att_month,
EXTRACT(YEAR FROM attendance_date) AS att_year,
COUNT(*) FILTER (WHERE attendance_type='P') AS present_days,
COUNT(*) FILTER (WHERE attendance_type='A') AS absent_days,
COUNT(*) FILTER (WHERE attendance_type='L') AS leave_days,
COUNT(*) FILTER (WHERE attendance_type='H') AS half_days,
COUNT(*) FILTER (WHERE attendance_type='OFF') AS off_days,
COALESCE(SUM(
CASE attendance_type
WHEN 'P' THEN 1
WHEN 'H' THEN 0.5
WHEN 'L' THEN 1
ELSE 0
END
),0) AS payable_units,
COALESCE(SUM(work_minutes),0) AS total_work_minutes
FROM staff_attendance
GROUP BY staff_id, mess_id, EXTRACT(MONTH FROM attendance_date), EXTRACT(YEAR FROM attendance_date)
) a
ON a.staff_id=ss.staff_id
AND a.mess_id=ss.mess_id
AND a.att_month=ss.month
AND a.att_year=ss.year
LEFT JOIN (
SELECT
staff_id,
mess_id,
EXTRACT(MONTH FROM payment_date) AS pay_month,
EXTRACT(YEAR FROM payment_date) AS pay_year,
SUM(amount) AS total_paid,
json_agg(
json_build_object(
'id', id,
'payment_date', payment_date,
'amount', amount,
'payment_type', payment_type,
'note', note
) ORDER BY payment_date DESC, id DESC
) AS payments
FROM staff_payments
GROUP BY staff_id, mess_id, EXTRACT(MONTH FROM payment_date), EXTRACT(YEAR FROM payment_date)
) p
ON p.staff_id=ss.staff_id
AND p.mess_id=ss.mess_id
AND p.pay_month=ss.month
AND p.pay_year=ss.year
WHERE ss.mess_id=$1
AND ss.month=$2
AND ss.year=$3
ORDER BY s.name`,
[messId,month,year]
);

res.json({success:true,data:result.rows});

}catch(err){

console.error(err);
res.status(500).json({error:"Server error"});

}

}
