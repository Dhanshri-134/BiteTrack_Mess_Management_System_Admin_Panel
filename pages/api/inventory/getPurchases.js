import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();
if(req.method!=="POST") return res.status(405).json({success:false,error:"Method not allowed"});

try{

const token=req.headers.authorization?.split(" ")[1];

if(!token){
return res.status(401).json({success:false,error:"Token required"});
}

const decoded=jwt.verify(token,process.env.JWT_SECRET);
const messId=decoded.messId;

const result = await pgPool.query(

`
SELECT
p.id,
p.invoice_number,
p.purchase_date,
p.total_amount,

v.vendor_name,

COUNT(pi.id) as items_count

FROM inventory_purchases p

LEFT JOIN inventory_vendors v
ON v.id=p.vendor_id

LEFT JOIN inventory_purchase_items pi
ON pi.purchase_id=p.id

WHERE p.mess_id=$1

GROUP BY p.id,v.vendor_name

ORDER BY p.purchase_date DESC
`,
[messId]
);

res.json({
success:true,
data:result.rows
});

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}