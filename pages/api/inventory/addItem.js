import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {

res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

if (req.method === "OPTIONS") return res.status(200).end();
if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

try {

const token = req.headers.authorization?.split(" ")[1];
if (!token) return res.status(401).json({ success: false, error: "Token required" });

jwt.verify(token, process.env.JWT_SECRET);

const {
item_name,
category_id,
unit,
description
} = req.body;

if (!item_name || !unit) {
return res.status(400).json({
success: false,
error: "Item name and unit required"
});
}

/* prevent duplicates */

const existing = await pgPool.query(
`SELECT id
 FROM inventory_items
 WHERE LOWER(item_name)=LOWER($1)
 AND category_id=$2
 LIMIT 1`,
[item_name,category_id]
);

if(existing.rows.length>0){

return res.json({
success:true,
data:existing.rows[0],
message:"Item already exists"
});

}

const result = await pgPool.query(
`INSERT INTO inventory_items
(item_name,category_id,unit,description)
VALUES($1,$2,$3,$4)
RETURNING *`,
[
item_name,
category_id || null,
unit,
description || null
]
);

res.json({
success:true,
data:result.rows[0]
});

} catch (err) {

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}