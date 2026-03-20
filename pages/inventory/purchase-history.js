import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/table.module.css";
import { useRouter } from "next/router";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";

export default function PurchaseHistory(){

const router = useRouter();

const [rows,setRows] = useState([]);
const [filtered,setFiltered] = useState([]);
const [search,setSearch] = useState("");

useEffect(()=>{
loadPurchases();
},[]);

useAppRefresh(loadPurchases);

useEffect(()=>{
filterRows();
},[search,rows]);

async function loadPurchases(){

try{

const result = await inventoryOfflineRequest(
"inventory-purchases",
"/api/inventory/getPurchases/"
);

if(result.success){
setRows(result.data);
setFiltered(result.data);
}

}catch(err){
console.error(err);
}

}

function filterRows(){

if(!search){
setFiltered(rows);
return;
}

const s = search.toLowerCase();

setFiltered(
rows.filter(r =>
(r.vendor_name || "").toLowerCase().includes(s) ||
(r.invoice_number || "").toLowerCase().includes(s)
)
);

}

return(

<Layout title="Purchase History">

<div className={styles.pageHeader}>

<h2>Purchase History</h2>

</div>

<input
className={styles.searchInput}
placeholder="Search vendor or invoice..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

<table className={styles.table}>

<thead>

<tr>
<th>Date</th>
<th>Vendor</th>
<th>Invoice</th>
<th>Items</th>
<th>Total</th>
</tr>

</thead>

<tbody>

{filtered.length===0 && (

<tr>
<td colSpan="5">No purchases found</td>
</tr>

)}

{filtered.map(r=>(

<tr
key={r.id}
style={{cursor:"pointer"}}
onClick={()=>router.push(`/inventory/purchase-details/${r.id}`)}
>

<td>
{new Date(r.purchase_date).toLocaleDateString()}
</td>

<td>
{r.vendor_name || "-"}
</td>

<td>
{r.invoice_number || "-"}
</td>

<td>
{r.items_count}
</td>

<td>
₹ {Number(r.total_amount).toLocaleString()}
</td>

</tr>

))}

</tbody>

</table>

</Layout>

);

}
