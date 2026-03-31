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

const vendor = await pgPool.query(
`
SELECT
v.id,
v.vendor_name,
v.phone,
v.email,
v.address,
v.gst_number,
TO_CHAR(v.created_at, 'DD-MM-YYYY') AS created_at,
v.notes
FROM inventory_vendors v
WHERE v.mess_id=$1
AND v.id=$2
LIMIT 1
`,
[messId,vendor_id]
);

if(vendor.rows.length===0){
return res.status(404).json({
success:false,
error:"Vendor not found"
});
}

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

const summary = await pgPool.query(
`
SELECT
COALESCE(SUM(p.total_amount),0) AS total_amount,
COUNT(*) AS purchase_count,
COALESCE(SUM(pi.quantity),0) AS total_quantity,
MAX(p.purchase_date) AS last_purchase
FROM inventory_purchases p
LEFT JOIN inventory_purchase_items pi
ON pi.purchase_id=p.id
WHERE p.mess_id=$1
AND p.vendor_id=$2
`,
[messId,vendor_id]
);

res.json({
success:true,
vendor:vendor.rows[0],
summary:summary.rows[0],
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
