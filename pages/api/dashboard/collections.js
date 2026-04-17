import jwt from "jsonwebtoken";
import { pgPool } from "../../../lib/db";

function getCurrentYearMonthInIndia() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return { year, month };
}

export default async function handler(req,res){

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");

if(req.method==="OPTIONS") return res.status(200).end();

try{

const auth=req.headers.authorization;
if(!auth) return res.status(401).json({error:"Unauthorized"});

const token=auth.split(" ")[1];
const decoded=jwt.verify(token,process.env.JWT_SECRET);
const messId=decoded.messId;
const { month, year } = req.query;
const currentIndia = getCurrentYearMonthInIndia();
const targetMonth = Number(month || currentIndia.month);
const targetYear = Number(year || currentIndia.year);

const {rows}=await pgPool.query(
`
SELECT 
COALESCE(SUM(amount) FILTER (
  WHERE year = $2
    AND (
      CASE
        WHEN month ~ '^[0-9]+$' THEN CAST(month AS INTEGER)
        ELSE EXTRACT(MONTH FROM TO_DATE(month, 'Month'))
      END
    ) = $3
),0) AS monthly_collected,
COALESCE(SUM(amount) FILTER (
  WHERE payment_date::date=CURRENT_DATE
),0) AS today_collected
FROM payment_history
WHERE mess_id=$1
AND status='paid'
`,
[messId, targetYear, targetMonth]
);

return res.json(rows[0]);

}catch(err){
console.error(err);
return res.status(500).json({error:"Server error"});
}
}
