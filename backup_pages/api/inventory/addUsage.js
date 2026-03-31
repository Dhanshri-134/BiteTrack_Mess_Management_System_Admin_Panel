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

const {usage_date,notes,items=[]}=req.body;

const client = await pgPool.connect();

try{

await client.query("BEGIN");

const normalizedItems = items
.map((item) => ({
item_id: Number(item.item_id),
quantity: Number(item.quantity)
}))
.filter((item) => item.item_id && item.quantity > 0);

if(normalizedItems.length === 0){
await client.query("ROLLBACK");
return res.status(400).json({
success:false,
error:"At least one valid item is required"
});
}

const demandByItem = normalizedItems.reduce((acc, item) => {
acc[item.item_id] = (acc[item.item_id] || 0) + item.quantity;
return acc;
}, {});

for (const [itemId, requiredQty] of Object.entries(demandByItem)) {
const stockRow = await client.query(
`
SELECT total_stock
FROM inventory_stock
WHERE mess_id=$1
AND item_id=$2
AND COALESCE(is_active, TRUE)=TRUE
LIMIT 1
`,
[messId, Number(itemId)]
);

if(stockRow.rowCount === 0){
await client.query("ROLLBACK");
return res.status(400).json({
success:false,
error:"Stock not found for one or more items"
});
}

if(Number(stockRow.rows[0].total_stock || 0) < Number(requiredQty)){
await client.query("ROLLBACK");
return res.status(400).json({
success:false,
error:"Not enough stock for one or more items"
});
}
}

/* create usage record */

const usage = await client.query(
`
INSERT INTO inventory_usage
(mess_id,usage_date,notes)
VALUES($1,$2,$3)
RETURNING id
`,
[messId,usage_date || new Date().toISOString().slice(0, 10),notes || null]
);

const usageId = usage.rows[0].id;

/* insert usage items */

for(const i of normalizedItems){

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
UPDATE inventory_stock
SET total_stock = total_stock - $1
WHERE mess_id=$2
AND item_id=$3
`,
[
i.quantity,
messId,
i.item_id
]
);

await client.query(
`
INSERT INTO inventory_stock_transactions
(mess_id,item_id,transaction_type,quantity,reference_id,reference_type,notes)
VALUES($1,$2,'usage',$3,$4,'usage',$5)
`,
[
messId,
i.item_id,
i.quantity,
usageId,
notes || null
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
