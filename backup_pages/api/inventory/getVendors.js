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

const vendors = await pgPool.query(
`
SELECT 
v.id,
v.vendor_name,
v.phone,
v.email,
v.address,
v.gst_number,
v.notes,

COALESCE(SUM(p.total_amount),0) AS total_purchases,
COUNT(DISTINCT p.id) AS purchase_count,
COUNT(DISTINCT pi.item_id) AS items_supplied,
MAX(p.purchase_date) AS last_purchase

FROM inventory_vendors v

LEFT JOIN inventory_purchases p
ON p.vendor_id=v.id
AND p.mess_id=$1

LEFT JOIN inventory_purchase_items pi
ON pi.purchase_id=p.id

WHERE v.mess_id=$1

GROUP BY v.id

ORDER BY v.vendor_name
`,
[messId]
);

res.json({
success:true,
data:vendors.rows
});

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}
