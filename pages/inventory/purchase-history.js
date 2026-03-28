import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import { useRouter } from "next/router";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "../../context/LanguageContext";

export default function PurchaseHistory(){

const router = useRouter();
const {t} = useLanguage();
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

      <section className={styles.heroSection}>
        <div>
          <div className={styles.header}>

            <p className={styles.eyebrow}>{t("inventory")}</p>
            <button
              className={styles.backbtn}
              onClick={() => router.back()}
            >
              ← Back
            </button>
          </div>
            <h1 className={styles.heroTitle}>{t("purchaseHistory")}</h1>
          {/* <p className={styles.heroSubtitle}>{t("vendorListSubtitle")}</p> */}
        </div>
        </section>

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

<td data-label={t("date")}>
{new Date(r.purchase_date).toLocaleDateString()}
</td>

<td data-label={t("vendor")}>
{r.vendor_name || "-"}
</td>

<td data-label={t("invoice")}>
{r.invoice_number || "-"}
</td>

<td data-label={t("items")}>
{r.items_count}
</td>

<td data-label={t("total")}>
₹ {Number(r.total_amount).toLocaleString()}
</td>

</tr>

))}

</tbody>

</table>

</Layout>

);

}
