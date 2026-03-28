import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();

try{

const token=req.headers.authorization?.split(" ")[1];
if(!token){
return res.status(401).json({success:false,error:"Token required"});
}

const decoded=jwt.verify(token,process.env.JWT_SECRET);
const messId=decoded.messId;

const {item_id} = req.body;

const result = await pgPool.query(`
SELECT 
i.id,
i.item_name,
i.unit,
COALESCE(s.min_stock, 0) AS min_stock,

COALESCE(SUM(
CASE
WHEN t.transaction_type='purchase' THEN t.quantity
WHEN t.transaction_type='usage' THEN -t.quantity
WHEN t.transaction_type='adjustment' THEN t.quantity
ELSE 0
END
),0) AS stock

FROM inventory_items i

LEFT JOIN inventory_stock s
ON s.item_id=i.id
AND s.mess_id=$2

LEFT JOIN inventory_stock_transactions t
ON t.item_id=i.id
AND t.mess_id=$2

WHERE i.id=$1

GROUP BY i.id,i.item_name,i.unit,s.min_stock
`,[item_id,messId]);

res.json({
success:true,
data:result.rows[0]
});

}catch(err){
console.error(err);
res.status(500).json({success:false,error:"Server error"});
}

}
