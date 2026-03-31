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
return res.status(401).json({
success:false,
error:"Token required"
});
}

jwt.verify(token,process.env.JWT_SECRET);

const {category_name,description} = req.body || {};
const cleanName = category_name?.trim();
const cleanDescription = description?.trim() || null;

if(!cleanName){
return res.status(400).json({
success:false,
error:"Category name required"
});
}

const existing = await pgPool.query(
`SELECT id FROM inventory_categories
WHERE LOWER(category_name)=LOWER($1)
LIMIT 1`,
[cleanName]
);

if(existing.rows.length>0){

return res.json({
success:true,
data:existing.rows[0],
message:"Category already exists"
});

}

const result = await pgPool.query(
`INSERT INTO inventory_categories
(category_name,description)
VALUES($1,$2)
RETURNING id,category_name,description`,
[cleanName,cleanDescription]
);

res.json({
success:true,
data:result.rows[0]
});

}catch(err){

console.error(err);

res.status(500).json({
success:false,
error:"Server error"
});

}

}
