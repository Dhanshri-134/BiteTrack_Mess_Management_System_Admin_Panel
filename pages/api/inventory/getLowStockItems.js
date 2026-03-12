import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();

try{

const token=req.headers.authorization?.split(" ")[1];
const decoded=jwt.verify(token,process.env.JWT_SECRET);
const messId=decoded.messId;

const result=await pgPool.query(
`SELECT
id,
item_name,
current_stock,
min_stock,
unit
FROM inventory_items
WHERE mess_id=$1
AND current_stock<=min_stock
ORDER BY item_name`,
[messId]
);

res.json(result.rows);

}catch(err){

res.status(500).json({error:"Server error"});

}

}