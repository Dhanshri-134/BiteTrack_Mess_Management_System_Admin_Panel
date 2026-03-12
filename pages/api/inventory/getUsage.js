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

const result = await pgPool.query(
`
SELECT
u.id,
u.usage_date,
u.notes,

json_agg(
json_build_object(
'item_name',i.item_name,
'quantity',ui.quantity,
'unit',i.unit
)
) AS items

FROM inventory_usage u

LEFT JOIN inventory_usage_items ui
ON ui.usage_id = u.id

LEFT JOIN inventory_items i
ON i.id = ui.item_id

WHERE u.mess_id = $1

GROUP BY u.id

ORDER BY u.usage_date DESC
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