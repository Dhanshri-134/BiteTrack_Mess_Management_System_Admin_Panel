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

jwt.verify(token,process.env.JWT_SECRET);

const {search} = req.body;

let result;

if(search && search.trim() !== ""){

result = await pgPool.query(
`SELECT id,category_name
FROM inventory_categories
WHERE LOWER(category_name) LIKE LOWER($1)
ORDER BY category_name
LIMIT 10`,
[`%${search}%`]
);

}else{

result = await pgPool.query(
`SELECT id,category_name
FROM inventory_categories
ORDER BY category_name
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