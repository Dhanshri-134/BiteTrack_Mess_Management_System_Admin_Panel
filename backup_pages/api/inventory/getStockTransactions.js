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

const {item_id}=req.body;

let query;
let params;

if(item_id){

query=`
SELECT
t.*,
i.item_name
FROM inventory_stock_transactions t
JOIN inventory_items i ON i.id=t.item_id
WHERE t.mess_id=$1 AND t.item_id=$2
ORDER BY t.created_at DESC
`;

params=[messId,item_id];

}else{

query=`
SELECT
t.*,
i.item_name
FROM inventory_stock_transactions t
JOIN inventory_items i ON i.id=t.item_id
WHERE t.mess_id=$1
ORDER BY t.created_at DESC
LIMIT 200
`;

params=[messId];

}

const result=await pgPool.query(query,params);

res.json(result.rows);

}catch(err){

console.error(err);
res.status(500).json({error:"Server error"});

}

}