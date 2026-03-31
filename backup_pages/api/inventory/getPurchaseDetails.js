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

const {purchase_id} = req.body;

/* purchase info */

const purchase = await pgPool.query(
`
SELECT
p.id,
p.invoice_number,
p.purchase_date,
p.total_amount,
v.vendor_name
FROM inventory_purchases p

LEFT JOIN inventory_vendors v
ON v.id=p.vendor_id

WHERE p.id=$1
AND p.mess_id=$2
`,
[purchase_id,messId]
);

/* items */

const items = await pgPool.query(
`
SELECT
pi.id,
i.item_name,
i.unit,
pi.quantity,
pi.unit_price,
pi.total_price

FROM inventory_purchase_items pi

LEFT JOIN inventory_items i
ON i.id=pi.item_id

WHERE pi.purchase_id=$1
`,
[purchase_id]
);

res.json({
success:true,
purchase:purchase.rows[0],
items:items.rows
});

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}