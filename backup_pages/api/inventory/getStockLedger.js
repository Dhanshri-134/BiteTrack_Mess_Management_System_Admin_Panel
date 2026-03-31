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

const result = await pgPool.query(
`SELECT
transaction_type,
quantity,
reference_type,
notes,
created_at
FROM inventory_stock_transactions
WHERE mess_id=$1
AND item_id=$2
ORDER BY created_at DESC`,
[messId,item_id]
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