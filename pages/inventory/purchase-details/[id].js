import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/inventory.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import PurchaseDetailsView from "../../../components/inventory/PurchaseDetailsView";

export default function PurchaseDetails(){

const router = useRouter();
const { id } = router.query;

const [purchase,setPurchase] = useState(null);
const [items,setItems] = useState([]);
const [loading,setLoading] = useState(true);
const [error,setError] = useState("");

function formatCurrency(value){
return `Rs ${Number(value || 0).toLocaleString()}`;
}

useEffect(()=>{
if(!router.isReady) return;
loadDetails();
},[router.isReady]);

async function loadDetails(){

try{
setLoading(true);
setError("");

const result = await inventoryOfflineRequest(
`inventory-purchase-details-${id}`,
"/api/inventory/getPurchaseDetails/",
{
body:{
purchase_id:id
}
}
);

if(result.success){
setPurchase(result.purchase || null);
setItems(result.items || []);
}

}catch(err){
console.error(err);
setError(err.message || "Failed to load purchase details");
}
finally{
setLoading(false);
}

}

useAppRefresh(() => {
if (router.isReady && id) {
loadDetails();
}
});

if(loading){
return <Layout title="Purchase Details"><p>Loading...</p></Layout>;
}

if(!purchase){
return <Layout title="Purchase Details"><p>{error || "Purchase not found"}</p></Layout>;
}

return (
<PurchaseDetailsView
purchase={purchase}
items={items}
error={error}
onBack={() => router.back()}
/>
);

return(

<Layout title={`Purchase: ${purchase.vendor_name || "Details"}`}>

<section className={styles.heroSection}>

<div>
<div className={styles.header}>
<p className={styles.eyebrow}>Inventory</p>

<button
className={styles.backbtn}
onClick={()=>router.back()}
>
← Back
</button>

</div>

<h1 className={styles.heroTitle}>Purchase Details</h1>
</div>
</section>

{error ? <p className={styles.errorText}>{error}</p> : null}

<section className={styles.infoGrid}>
<div>
<span>Vendor</span>
<strong>{purchase.vendor_name || "-"}</strong>
</div>
<div>
<span>Invoice</span>
<strong>{purchase.invoice_number || "-"}</strong>
</div>
<div>
<span>Date</span>
<strong>{new Date(purchase.purchase_date).toLocaleDateString()}</strong>
</div>
<div>
<span>Total</span>
<strong>{formatCurrency(purchase.total_amount)}</strong>
</div>
</section>

<div className={styles.formCard}>
<div className={styles.formCardHeader}>
<div>
<h3 className={styles.formCardTitle}>Purchased Items</h3>
<p className={styles.formCardText}>
{items.length} item{items.length === 1 ? "" : "s"} in this purchase.
</p>
</div>
</div>


<p><strong>Total:</strong> ₹ {Number(purchase.total_amount).toLocaleString()}</p>

</div>

<table className={styles.table}>

<thead>

<tr>
<th>Item</th>
<th>Qty</th>
<th>Unit</th>
<th>Price</th>
<th>Total</th>
</tr>

</thead>

<tbody>

{items.map(i=>(

<tr key={i.id}>

<td>{i.item_name}</td>

<td>{i.quantity}</td>

<td>{i.unit}</td>

<td>₹ {i.unit_price}</td>

<td>₹ {i.total_price}</td>

</tr>

))}

</tbody>

</table>

</Layout>

);

}
