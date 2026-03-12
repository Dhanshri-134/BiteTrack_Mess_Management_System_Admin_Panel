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
vendor_name,
invoice_number,
quantity,
unit_price,
notes
} = req.body;

if(!item_id || !quantity){
return res.status(400).json({
success:false,
error:"Item and quantity required"
});
}

await client.query("BEGIN");

let vendorId = null;

if(vendor_name){

const existingVendor = await client.query(
`SELECT id FROM inventory_vendors
WHERE mess_id=$1
AND LOWER(vendor_name)=LOWER($2)
LIMIT 1`,
[messId,vendor_name]
);

if(existingVendor.rows.length>0){

vendorId = existingVendor.rows[0].id;

}else{

const newVendor = await client.query(
`INSERT INTO inventory_vendors
(mess_id,vendor_name)
VALUES($1,$2)
RETURNING id`,
[messId,vendor_name]
);

vendorId = newVendor.rows[0].id;

}

}

const purchase = await client.query(
`INSERT INTO inventory_purchases
(mess_id,vendor_id,invoice_number,purchase_date,total_amount)
VALUES($1,$2,$3,CURRENT_DATE,$4)
RETURNING id`,
[
messId,
vendorId,
invoice_number || null,
quantity * (unit_price || 0)
]
);

const purchaseId = purchase.rows[0].id;

await client.query(
`INSERT INTO inventory_purchase_items
(purchase_id,item_id,quantity,unit_price,total_price)
VALUES($1,$2,$3,$4,$5)`,
[
purchaseId,
item_id,
quantity,
unit_price || 0,
quantity * (unit_price || 0)
]
);

const existingStock = await client.query(
`SELECT id,total_stock
FROM inventory_stock
WHERE mess_id=$1
AND item_id=$2`,
[messId,item_id]
);

if(existingStock.rows.length>0){

await client.query(
`UPDATE inventory_stock
SET total_stock = total_stock + $1
WHERE mess_id=$2 AND item_id=$3`,
[quantity,messId,item_id]
);

}else{

await client.query(
`INSERT INTO inventory_stock
(mess_id,item_id,total_stock,is_active)
VALUES($1,$2,$3,true)`,
[messId,item_id,quantity]
);

}

await client.query(
`INSERT INTO inventory_stock_transactions
(mess_id,item_id,transaction_type,quantity,reference_id,reference_type,notes)
VALUES($1,$2,'purchase',$3,$4,'purchase',$5)`,
[messId,item_id,quantity,purchaseId,notes]
);

await client.query("COMMIT");

res.json({
success:true,
message:"Stock added successfully"
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