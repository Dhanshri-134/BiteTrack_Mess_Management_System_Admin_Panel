import { pgPool } from "@/lib/db";
import jwt from "jsonwebtoken";

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();
if(req.method!=="POST") return res.status(405).json({success:false,error:"Method not allowed"});

try{

const token=req.headers.authorization?.split(" ")[1];

if(!token){
return res.status(401).json({
success:false,
error:"Token required"
});
}

jwt.verify(token,process.env.JWT_SECRET);

const {search,category_id} = req.body;

let result;

if(search && search.trim() !== ""){

if(category_id){

result = await pgPool.query(
`SELECT id,item_name,unit,description
FROM inventory_items
WHERE category_id=$1
AND LOWER(item_name) LIKE LOWER($2)
ORDER BY item_name
LIMIT 10`,
[category_id,`%${search}%`]
);

}else{

result = await pgPool.query(
`SELECT id,item_name,unit,description
FROM inventory_items
WHERE LOWER(item_name) LIKE LOWER($1)
ORDER BY item_name
LIMIT 10`,
[`%${search}%`]
);

}

}else{

result = await pgPool.query(
`SELECT id,item_name,unit,description
FROM inventory_items
ORDER BY item_name
LIMIT 10`
);

}

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