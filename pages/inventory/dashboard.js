import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import  Link from "next/link";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "../../context/LanguageContext";

export default function InventoryDashboard(){

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

<Layout title="Inventory Dashboard">

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
    <Card title="Total Items" value={stats.totalItems} loading={loading}/>
</Link>
<Link href="/inventory/vendors/">
    <Card title="Vendors" value={stats.totalVendors} loading={loading}/>
</Link>
<Link href="/inventory/low-stock/">
    <Card title="Low Stock" value={stats.lowStock} loading={loading}/>
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

<h3>Top Used Items</h3>
{stats.topItems.length===0 && <p>No usage data</p>}

{stats.topItems.map(i=>(
<div key={i.item_name} className={styles.listRow}>
<span>{i.item_name}</span>
<span>{i.used}</span>
</div>
))}

</div>

<div className={styles.panel}>

<h3>Recent Purchases</h3>
{stats.recentPurchases.length===0 && <p>No purchases yet</p>}
{stats.recentPurchases.map(p=>(
<div key={p.id} className={styles.listRow}>
<span>{p.vendor_name}</span>
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
