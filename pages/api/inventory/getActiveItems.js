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
SELECT *
FROM (

SELECT
i.id,
i.item_name,
i.unit,
c.category_name,

SUM(
CASE 
WHEN t.transaction_type='purchase' THEN t.quantity
WHEN t.transaction_type='usage' THEN -t.quantity
WHEN t.transaction_type='adjustment' THEN -t.quantity
ELSE 0
END
) AS current_stock

FROM inventory_items i

LEFT JOIN inventory_categories c
ON c.id=i.category_id

LEFT JOIN inventory_stock_transactions t
ON t.item_id=i.id
AND t.mess_id=$1

GROUP BY i.id,i.item_name,i.unit,c.category_name

) stock

WHERE stock.current_stock > 0

ORDER BY stock.item_name
`,
[messId]
);

res.json({
success:true,
data:result.rows
});

console.log(result.rows);

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}