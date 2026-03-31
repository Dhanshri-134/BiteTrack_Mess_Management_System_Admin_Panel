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
return res.status(401).json({
success:false,
error:"Token required"
});
}

jwt.verify(token,process.env.JWT_SECRET);

const {category_id} = req.body;

const result = await pgPool.query(`
SELECT 
i.id,
i.item_name,
i.unit,
i.description,
c.category_name
FROM inventory_items i
JOIN inventory_categories c
ON c.id=i.category_id
WHERE i.category_id=$1
ORDER BY i.item_name
`,[category_id]);

res.json({
success:true,
category_name: result.rows[0]?.category_name || "",
data: result.rows
});

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}