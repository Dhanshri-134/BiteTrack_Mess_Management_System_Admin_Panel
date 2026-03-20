import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/table.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";

export default function UsageHistory(){

const [usage,setUsage]=useState([]);

useEffect(()=>{
loadUsage();
},[]);

useAppRefresh(loadUsage);

async function loadUsage(){
const result = await inventoryOfflineRequest(
"inventory-usage-history",
"/api/inventory/getUsage/"
);

setUsage(result.data || []);

}

return(

<Layout title="Usage History">

<h2>Usage History</h2>

<table className={styles.table}>

<thead>
<tr>
<th>Date</th>
<th>Items</th>
</tr>
</thead>

<tbody>

{usage.map(u=>(
<tr key={u.id}>
<td>{u.usage_date}</td>
<td>

{u.items?.map((i,index)=>(
<div key={`${u.id}-${index}`}>
{i.item_name} - {i.quantity}
</div>
))}

</td>
</tr>
))}

</tbody>

</table>

</Layout>

);

}
