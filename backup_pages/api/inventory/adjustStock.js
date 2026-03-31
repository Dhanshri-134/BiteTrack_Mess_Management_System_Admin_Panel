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
adjustment_quantity,
reason
} = req.body;

if(!item_id || !adjustment_quantity){
return res.status(400).json({
success:false,
error:"Item and adjustment quantity required"
});
}

await client.query("BEGIN");

/* adjust stock */

await client.query(
`UPDATE inventory_stock
SET total_stock = total_stock + $1
WHERE mess_id=$2 AND item_id=$3`,
[adjustment_quantity,messId,item_id]
);

/* record adjustment */

const adjust = await client.query(
`INSERT INTO inventory_stock_adjustments
(mess_id,item_id,adjustment_quantity,reason)
VALUES($1,$2,$3,$4)
RETURNING id`,
[messId,item_id,adjustment_quantity,reason || null]
);

const adjustId = adjust.rows[0].id;

/* ledger entry */

await client.query(
`INSERT INTO inventory_stock_transactions
(mess_id,item_id,transaction_type,quantity,reference_id,reference_type,reason)
VALUES($1,$2,'adjustment',$3,$4,'adjustment',$5)`,
[messId,item_id,adjustment_quantity,adjustId,reason]
);

await client.query("COMMIT");

res.json({
success:true,
message:"Stock adjusted successfully"
});

}catch(err){

await client.query("ROLLBACK");

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}finally{
client.release();
}

}