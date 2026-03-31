import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/table.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";

export default function LowStock(){

const [items,setItems]=useState([]);

useEffect(()=>{
loadData();
},[]);

useAppRefresh(loadData);

async function loadData(){
const result = await inventoryOfflineRequest(
"inventory-low-stock",
"/api/inventory/getLowStockItems/"
);

setItems(result.data || []);

}

return(

<Layout title="Low Stock">

<h2>Low Stock Items</h2>

<table className={styles.table}>

<thead>
<tr>
<th>Item</th>
<th>Current</th>
<th>Minimum</th>
<th>Unit</th>
</tr>
</thead>

<tbody>

{items.map(i=>(
<tr key={i.id}>
<td>{i.item_name}</td>
<td>{i.current_stock}</td>
<td>{i.min_stock}</td>
<td>{i.unit}</td>
</tr>
))}

</tbody>

</table>

</Layout>

);

}
