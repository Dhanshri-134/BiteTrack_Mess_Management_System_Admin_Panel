import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();
if(req.method!=="POST") return res.status(405).json({success:false,error:"Method not allowed"});

try{

const token=req.headers.authorization?.split(" ")[1];
if(!token) return res.status(401).json({success:false,error:"Token required"});

const decoded=jwt.verify(token,process.env.JWT_SECRET);
const messId=decoded.messId;

const items=await pgPool.query(
`SELECT COUNT(*) 
 FROM inventory_stock
 WHERE mess_id=$1
 AND is_active IS NOT FALSE`,
[messId]
);

const vendors=await pgPool.query(
`SELECT COUNT(*) FROM inventory_vendors WHERE mess_id=$1`,
[messId]
);

const lowStock=await pgPool.query(
`SELECT COUNT(*)
 FROM inventory_stock
 WHERE mess_id=$1
 AND is_active IS NOT FALSE
 AND COALESCE(total_stock,0) <= COALESCE(min_stock,0)`,
[messId]
);

const usage=await pgPool.query(
`SELECT COALESCE(SUM(ui.quantity),0) total
FROM inventory_usage_items ui
JOIN inventory_usage u ON u.id=ui.usage_id
WHERE u.mess_id=$1 AND u.usage_date=CURRENT_DATE`,
[messId]
);

const topItems=await pgPool.query(
`SELECT i.item_name,
SUM(ui.quantity) used
FROM inventory_usage_items ui
JOIN inventory_items i ON i.id=ui.item_id
JOIN inventory_usage u ON u.id=ui.usage_id
WHERE u.mess_id=$1
GROUP BY i.item_name
ORDER BY used DESC
LIMIT 5`,
[messId]
);

const recentPurchases=await pgPool.query(
`SELECT
p.id,
p.purchase_date,
v.vendor_name,
COUNT(pi.id) AS items_count,
ARRAY_REMOVE(ARRAY_AGG(DISTINCT i.item_name), NULL) AS item_names
FROM inventory_purchases p
LEFT JOIN inventory_vendors v ON v.id=p.vendor_id
LEFT JOIN inventory_purchase_items pi ON pi.purchase_id=p.id
LEFT JOIN inventory_items i ON i.id=pi.item_id
WHERE p.mess_id=$1
GROUP BY p.id,v.vendor_name
ORDER BY p.created_at DESC
LIMIT 5`,
[messId]
);

res.json({
success:true,
data:{
 totalItems:Number(items.rows[0].count),
 totalVendors:Number(vendors.rows[0].count),
 lowStock:Number(lowStock.rows[0].count),
 todayUsage:Number(usage.rows[0].total),
 topItems:topItems.rows,
 recentPurchases:recentPurchases.rows
}
});

}catch(err){

console.error(err);
res.status(500).json({success:false,error:"Server error"});

}

}
