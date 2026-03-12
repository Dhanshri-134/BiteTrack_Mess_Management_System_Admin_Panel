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

const {usage_date,notes,items}=req.body;

const client = await pgPool.connect();

try{

await client.query("BEGIN");

/* create usage record */

const usage = await client.query(
`
INSERT INTO inventory_usage
(mess_id,usage_date,notes)
VALUES($1,$2,$3)
RETURNING id
`,
[messId,usage_date,notes]
);

const usageId = usage.rows[0].id;

/* insert usage items */

for(const i of items){

await client.query(
`
INSERT INTO inventory_usage_items
(usage_id,item_id,quantity)
VALUES($1,$2,$3)
`,
[
usageId,
i.item_id,
i.quantity
]
);

/* reduce stock */

await client.query(
`
INSERT INTO inventory_stock_transactions
(mess_id,item_id,transaction_type,quantity,reference_id,reference_type)
VALUES($1,$2,'usage',$3,$4,'usage')
`,
[
messId,
i.item_id,
i.quantity,
usageId
]
);

}

await client.query("COMMIT");

res.json({
success:true
});

}catch(err){

await client.query("ROLLBACK");
throw err;

}finally{
client.release();
}

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}