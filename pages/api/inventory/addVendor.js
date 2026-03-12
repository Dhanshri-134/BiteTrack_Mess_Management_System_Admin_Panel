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

const {vendor_name,phone,email,address}=req.body;

if(!vendor_name)
return res.status(400).json({error:"Vendor name required"});

const result=await pgPool.query(
`INSERT INTO inventory_vendors
(mess_id,vendor_name,phone,email,address)
VALUES($1,$2,$3,$4)
RETURNING *`,
[messId,vendor_name,phone,ElementInternals,address]
);

res.json(result.rows[0]);

}catch(err){

res.status(500).json({error:"Server error"});

}

}