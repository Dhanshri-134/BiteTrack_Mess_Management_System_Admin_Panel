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
ss.base_salary,
ss.overtime_amount,
ss.penalty_amount,
ss.final_salary,
ss.payment_status,
COALESCE(p.total_paid,0) AS total_paid,
p.payments
FROM staff_salary ss
JOIN staff s ON s.id=ss.staff_id
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
