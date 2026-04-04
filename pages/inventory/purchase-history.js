import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import { useRouter } from "next/router";
import Link from "next/link";
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
(r.invoice_number || "").toLowerCase().includes(s) ||
(r.item_names || []).some((name) => String(name || "").toLowerCase().includes(s))
)
);

}

function formatItemPreview(itemNames) {

const names = Array.isArray(itemNames) ? itemNames.filter(Boolean) : [];

if(names.length === 0){
return "No items";
}

if(names.length <= 2){
return names.join(", ");
}

return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;

}

return(

<Layout title={t("purchaseHistory")}>

      <section className={styles.heroSection}>
        <div>
          <div className={styles.header}>

            <p className={styles.eyebrow}>{t("inventory")}</p>
            <button
              className={styles.backbtn}
              onClick={() => router.back()}
            >
              ← {t("Back")}
            </button>
          </div>
            <h1 className={styles.heroTitle}>{t("purchaseHistory")}</h1>
          {/* <p className={styles.heroSubtitle}>{t("vendorListSubtitle")}</p> */}
        </div>
        </section>

<div className={styles.inlineActions}>
<Link href="/inventory/add-purchases" className={styles.primaryBtn}>
{t("addPurchase")}
</Link>
<div className={styles.totalBox}>
{filtered.length} purchase{filtered.length === 1 ? "" : "s"} found
</div>
</div>

<input
className={styles.searchInput}
placeholder={t("searchVendorInvoiceOrItemName")}
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

<table className={styles.table}>

<thead>

<tr>
<th>{t("date")}</th>
<th>{t("vendor")}</th>
<th>{t("invoice")}</th>
<th>{t("items")}</th>
<th>{t("total")}</th>
</tr>

</thead>

<tbody>

{filtered.length===0 && (

<tr>
<td colSpan="5">{t("noPurchasesFound")}</td>
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
<div className={styles.tablePrimaryValue}>{r.items_count} item{Number(r.items_count) === 1 ? "" : "s"}</div>
<div className={styles.tableSecondaryValue}>{formatItemPreview(r.item_names)}</div>
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
