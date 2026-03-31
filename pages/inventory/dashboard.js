import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import  Link from "next/link";
import { useRouter } from "next/router";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "../../context/LanguageContext";

export default function InventoryDashboard(){

const router = useRouter();
const [loading,setLoading]=useState(true);
const {t} = useLanguage();
const [stats,setStats]=useState({
totalItems:0,
totalVendors:0,
lowStock:0,
todayUsage:0,
topItems:[],
recentPurchases:[]
});

useEffect(()=>{
loadDashboard();
},[]);

useAppRefresh(loadDashboard);

async function loadDashboard(){

try{

setLoading(true);

const result = await inventoryOfflineRequest(
"inventory-dashboard",
"/api/inventory/dashboard/"
);

if(result.success){
setStats(result.data);
}

}catch(err){
console.error(err);
}finally{
setLoading(false);
}

}

return(

<Layout title={t("inventoryDashboard")}>

<div className={styles.container}>

<section className={styles.heroSection}>
        <div>
          <p className={styles.eyebrow}>{t("inventory")}</p>
          <div className={styles.header}>

            <h1 className={styles.heroTitle}>{t("Dashboard")}</h1>
            <button
              className={styles.backbtn}
              onClick={() => router.back()}
            >
              ← Back
            </button>
          </div>
          {/* <p className={styles.heroSubtitle}>{t("vendorListSubtitle")}</p> */}
        </div>
        </section>

<div className={styles.cards}>

<Link href="/inventory/items/">
    <Card title={t("totalItems")} value={stats.totalItems} loading={loading}/>
</Link>
<Link href="/inventory/vendors/">
    <Card title={t("vendors")} value={stats.totalVendors} loading={loading}/>
</Link>
<Link href="/inventory/low-stock/">
    <Card title={t("lowStock")} value={stats.lowStock} loading={loading}/>
</Link>
<Link href="/inventory/usage/">
    <Card title="Today's Usage" value={stats.todayUsage} loading={loading}/>
</Link>
</div>



{/* Quick Actions */}

<div className={styles.quickActions}>

<Link href="/inventory/add-purchases" className={styles.actionBtn}>
Add Purchase
</Link>

<Link href="/inventory/usage" className={styles.actionBtn}>
Add Usage
</Link>

<Link href="/inventory/stock-ledger" className={styles.actionBtn}>
View Ledger
</Link>

</div>

<div className={styles.analytics}>

<div className={styles.panel}>

<h3>{t("topUsedItems")}</h3>
{stats.topItems.length===0 && <p>{t("noUsageData")}</p>}

{stats.topItems.map(i=>(
<div key={i.item_name} className={styles.listRow}>
<span>{i.item_name}</span>
<span>{i.used}</span>
</div>
))}

</div>

<div className={styles.panel}>

<h3>{t("recentPurchases")}</h3>
{stats.recentPurchases.length===0 && <p>{t("noPurchasesYet")}</p>}
{stats.recentPurchases.map(p=>(
<div key={p.id} className={styles.listRow}>
<div>
<span>{p.vendor_name}</span>
<div className={styles.tableSecondaryValue}>
{Array.isArray(p.item_names) && p.item_names.length > 0 ? p.item_names.slice(0, 2).join(", ") : "No items"}
{Array.isArray(p.item_names) && p.item_names.length > 2 ? ` +${p.item_names.length - 2} more` : ""}
</div>
</div>
<span>{new Date(p.purchase_date).toLocaleDateString()}</span>
</div>
))}

</div>

</div>

</div>

</Layout>

);

}

function Card({title,value,loading}){

return(

<div className={styles.card}>
<div className={styles.cardTitle}>{title}</div>
<div className={styles.cardValue}>
{loading ? "..." : value}
</div>
</div>

);

}
