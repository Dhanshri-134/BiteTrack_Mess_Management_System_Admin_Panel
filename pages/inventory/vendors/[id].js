import { useRouter } from "next/router";
import { useEffect,useMemo,useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/table.module.css";
import inventoryStyles from "../../../styles/inventory.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";

export default function VendorDetails(){

const router = useRouter();
const { id } = router.query;
const { t } = useLanguage();

const [rows,setRows] = useState([]);
const [vendor,setVendor] = useState(null);
const [summary,setSummary] = useState(null);
const [search,setSearch] = useState("");
const [loading,setLoading] = useState(true);
const [error,setError] = useState("");

useEffect(()=>{
if(!router.isReady) return;
loadPurchases();
},[router.isReady,id]);

useAppRefresh(()=>{
if(router.isReady && id) loadPurchases();
});

const filteredRows = useMemo(()=>{
const term = search.trim().toLowerCase();
if(!term) return rows;

return rows.filter((row)=>
[
row.invoice_number,
row.purchase_date ? new Date(row.purchase_date).toLocaleDateString() : ""
]
.filter(Boolean)
.some((value)=>String(value).toLowerCase().includes(term))
);
},[rows,search]);

async function loadPurchases(){

try{

const result = await inventoryOfflineRequest(
`inventory-vendor-purchases-v2-${id}`,
"/api/inventory/getVendorPurchases/",
{
body:{ vendor_id:id }
}
);

if(result.success){
setRows(result.data);
setVendor(result.vendor || null);
setSummary(result.summary || null);
}

}catch(err){
console.error(err);
setError(err.message);
}finally{
setLoading(false);
}

}

return(

<Layout title={t("vendorPurchases")}>

<section className={inventoryStyles.heroSection}>

<div>
<p className={inventoryStyles.eyebrow}>{t("inventory")}</p>
<h1 className={inventoryStyles.heroTitle}>{vendor?.vendor_name || t("vendorPurchases")}</h1>
<p className={inventoryStyles.heroSubtitle}>{t("vendorBasicInfo")}</p>
</div>

<button
className={inventoryStyles.secondaryBtn}
onClick={()=>router.back()}
>
← Back
</button>

</section>

{vendor && (
<section className={inventoryStyles.infoGrid}>
<div>
<span>{t("phone")}</span>
<strong>{vendor.phone || "-"}</strong>
</div>
<div>
<span>{t("email")}</span>
<strong>{vendor.email || "-"}</strong>
</div>
<div>
<span>{t("gstNumber")}</span>
<strong>{vendor.gst_number || "-"}</strong>
</div>
<div>
<span>{t("address")}</span>
<strong>{vendor.address || "-"}</strong>
</div>
</section>
)}

{vendor?.notes && (
<section className={inventoryStyles.totalBox}>
{vendor.notes}
</section>
)}

<section className={inventoryStyles.toolbar}>
<input
className={inventoryStyles.searchInput}
placeholder={t("searchInvoiceOrDate")}
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>
</section>

{summary && (
<section className={inventoryStyles.statStrip}>
<div className={inventoryStyles.statPill}>
<span>{t("purchaseCount")}</span>
<strong>{summary.purchase_count || 0}</strong>
</div>
<div className={inventoryStyles.statPill}>
<span>{t("itemsSupplied")}</span>
<strong>{Number(summary.total_quantity || 0).toLocaleString()}</strong>
</div>
<div className={inventoryStyles.statPill}>
<span>{t("totalPurchases")}</span>
<strong>Rs. {Number(summary.total_amount || 0).toLocaleString()}</strong>
</div>
<div className={inventoryStyles.statPill}>
<span>{t("lastPurchase")}</span>
<strong>{summary.last_purchase ? new Date(summary.last_purchase).toLocaleDateString() : "-"}</strong>
</div>
</section>
)}

{error && <p className={inventoryStyles.errorText}>{error}</p>}

{loading ? (

<p>{t("loadingPurchases")}</p>

):( 

<table className={styles.table}>

<thead>
<tr>
<th>{t("date")}</th>
<th>{t("invoice")}</th>
<th>{t("items")}</th>
<th>{t("total")}</th>
</tr>
</thead>

<tbody>

{filteredRows.length===0 && (
<tr>
<td colSpan="4">{t("noPurchasesFound")}</td>
</tr>
)}

{filteredRows.map(r => (

<tr key={r.id}>

<td>
{new Date(r.purchase_date).toLocaleDateString()}
</td>

<td>
{r.invoice_number || "-"}
</td>

<td>
{r.items_count}
</td>

<td>
₹{Number(r.total_amount).toLocaleString()}
</td>

</tr>

))}

</tbody>

</table>

)}

</Layout>

);

}
