import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();

try{

const auth=req.headers.authorization;
if(!auth) return res.status(401).json({error:"Unauthorized"});

const token=auth.split(" ")[1];
const decoded=jwt.verify(token,process.env.JWT_SECRET);
const messId=decoded.messId;

const {rows}=await pgPool.query(
`
SELECT 
COALESCE(SUM(amount),0) AS monthly_collected
FROM payment_history
WHERE mess_id=$1
AND status='paid'
AND DATE_TRUNC('month',payment_date)=DATE_TRUNC('month',CURRENT_DATE)
`,
[messId]
);

return res.json(rows[0]);

}catch(err){
console.error(err);
return res.status(500).json({error:"Server error"});
}
}