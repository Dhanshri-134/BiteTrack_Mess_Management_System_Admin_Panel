import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

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
const decoded=jwt.verify(token,process.env.JWT_SECRET);

const messId=decoded.messId;

const {month,year}=req.body;

const result=await pgPool.query(
`SELECT
ss.id,
ss.staff_id,
s.name,
ss.base_salary,
ss.overtime_amount,
ss.penalty_amount,
ss.final_salary,
ss.payment_status
FROM staff_salary ss
JOIN staff s ON s.id=ss.staff_id
WHERE ss.mess_id=$1
AND ss.month=$2
AND ss.year=$3
ORDER BY s.name`,
[messId,month,year]
);

res.json(result.rows);

}catch(err){

console.error(err);
res.status(500).json({error:"Server error"});

}

}