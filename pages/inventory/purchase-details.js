import { useRouter } from "next/router";
import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/table.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";

export default function PurchaseDetails(){

const router=useRouter();
const {id}=router.query;

const [purchase,setPurchase]=useState(null);

useEffect(()=>{
if(id) load();
},[id]);

useAppRefresh(()=>{
if(id) load();
});

async function load(){
const result = await inventoryOfflineRequest(
`inventory-purchase-${id}`,
"/api/inventory/getPurchaseDetails/",
{
body:{ purchase_id:id }
}
);

if(result.success){
setPurchase({
...result.purchase,
items:result.items || []
});
}

}

if(!purchase) return null;

return(

<Layout title="Purchase Details">

<h2>Purchase Details</h2>

<p>Vendor: {purchase.vendor_name || "-"}</p>
<p>Date: {new Date(purchase.purchase_date).toLocaleDateString()}</p>

<table className={styles.table}>

<thead>
<tr>
<th>Item</th>
<th>Qty</th>
<th>Price</th>
</tr>
</thead>

<tbody>

{purchase.items.map((i,index)=>(
<tr key={`${i.item_name}-${index}`}>
<td>{i.item_name}</td>
<td>{i.quantity}</td>
<td>{i.unit_price}</td>
</tr>
))}

</tbody>

</table>

</Layout>

);

}
