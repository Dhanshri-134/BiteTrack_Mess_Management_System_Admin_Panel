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

const {vendor_id} = req.body;

const purchases = await pgPool.query(
`
SELECT
p.id,
p.invoice_number,
p.purchase_date,
p.total_amount,
COUNT(pi.id) as items_count
FROM inventory_purchases p

LEFT JOIN inventory_purchase_items pi
ON pi.purchase_id=p.id

WHERE p.mess_id=$1
AND p.vendor_id=$2

GROUP BY p.id
ORDER BY p.purchase_date DESC
`,
[messId,vendor_id]
);

res.json({
success:true,
data:purchases.rows
});

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}