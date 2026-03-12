import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();

const client = await pgPool.connect();

try{

const token=req.headers.authorization?.split(" ")[1];

if(!token){
return res.status(401).json({success:false,error:"Token required"});
}

const decoded=jwt.verify(token,process.env.JWT_SECRET);
const messId=decoded.messId;

const {
item_id,
quantity,
notes
} = req.body;

if(!item_id || !quantity){
return res.status(400).json({
success:false,
error:"Item and quantity required"
});
}

await client.query("BEGIN");

/* check stock */

const stockCheck = await client.query(
`SELECT total_stock
FROM inventory_stock
WHERE mess_id=$1
AND item_id=$2`,
[messId,item_id]
);

if(stockCheck.rows.length === 0){
throw new Error("Stock not found");
}

const currentStock = Number(stockCheck.rows[0].total_stock);

if(currentStock < quantity){
throw new Error("Not enough stock");
}

/* create usage entry */

const usage = await client.query(
`INSERT INTO inventory_usage
(mess_id,usage_date,notes)
VALUES($1,CURRENT_DATE,$2)
RETURNING id`,
[messId,notes || null]
);

const usageId = usage.rows[0].id;

/* usage items */

await client.query(
`INSERT INTO inventory_usage_items
(usage_id,item_id,quantity)
VALUES($1,$2,$3)`,
[usageId,item_id,quantity]
);

/* decrease stock */

await client.query(
`UPDATE inventory_stock
SET total_stock = total_stock - $1
WHERE mess_id=$2 AND item_id=$3`,
[quantity,messId,item_id]
);

/* ledger transaction */

await client.query(
`INSERT INTO inventory_stock_transactions
(mess_id,item_id,transaction_type,quantity,reference_id,reference_type,notes)
VALUES($1,$2,'usage',$3,$4,'usage',$5)`,
[messId,item_id,quantity,usageId,notes]
);

await client.query("COMMIT");

res.json({
success:true,
message:"Stock used successfully"
});

}catch(err){

await client.query("ROLLBACK");

console.error(err);

res.status(500).json({
success:false,
error:err.message || "Server error"
});

}finally{
client.release();
}

}