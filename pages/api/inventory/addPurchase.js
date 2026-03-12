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

const {
vendor_id,
invoice_number,
purchase_date,
items
}=req.body;

const client = await pgPool.connect();

try{

await client.query("BEGIN");

let total=0;

items.forEach(i=>{
total+=Number(i.quantity)*Number(i.price);
});

const purchase = await client.query(

`INSERT INTO inventory_purchases
(mess_id,vendor_id,invoice_number,purchase_date,total_amount)
VALUES($1,$2,$3,$4,$5)
RETURNING id`,
[
messId,
vendor_id,
invoice_number,
purchase_date,
total
]
);

const purchaseId = purchase.rows[0].id;

for(const i of items){

await client.query(

`INSERT INTO inventory_purchase_items
(purchase_id,item_id,quantity,unit_price,total_price)
VALUES($1,$2,$3,$4,$5)`,

[
purchaseId,
i.item_id,
i.quantity,
i.price,
i.quantity*i.price
]
);

await client.query(

`INSERT INTO inventory_stock_transactions
(mess_id,item_id,transaction_type,quantity,reference_id,reference_type)
VALUES($1,$2,'purchase',$3,$4,'purchase')`,

[
messId,
i.item_id,
i.quantity,
purchaseId
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