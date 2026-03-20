import { useRouter } from "next/router";
import { useEffect,useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/table.module.css";

export default function PurchaseDetails(){

const router = useRouter();
const { id } = router.query;

const [purchase,setPurchase] = useState(null);
const [items,setItems] = useState([]);

const [loading,setLoading] = useState(true);

const getToken = () => localStorage.getItem("token");

useEffect(()=>{
if(!router.isReady) return;
loadDetails();
},[router.isReady]);

async function loadDetails(){

try{

const token = getToken();

const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/inventory/getPurchaseDetails/",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({
purchase_id:id
})
});

const result = await res.json();

if(result.success){
setPurchase(result.purchase);
setItems(result.items);
}

}catch(err){
console.error(err);
}
finally{
setLoading(false);
}

}

if(loading){
return <Layout title="Purchase Details"><p>Loading...</p></Layout>;
}

return(

<Layout title="Purchase Details">

<div className={styles.pageHeader}>

<h2>Purchase Details</h2>

<button
className={styles.secondaryBtn}
onClick={()=>router.back()}
>
← Back
</button>

</div>

<div className={styles.card}>

<p><strong>Vendor:</strong> {purchase.vendor_name || "-"}</p>

<p><strong>Invoice:</strong> {purchase.invoice_number || "-"}</p>

<p><strong>Date:</strong> {new Date(purchase.purchase_date).toLocaleDateString()}</p>

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