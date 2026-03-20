import { useEffect,useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import tableStyles from "../../styles/table.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";

export default function StockLedger(){

const { t } = useLanguage();
const [items,setItems] = useState([]);
const [ledger,setLedger] = useState([]);
const [selectedItem,setSelectedItem] = useState("");

useEffect(()=>{
loadItems();
},[]);

useAppRefresh(()=>{
loadItems();
if(selectedItem){
loadLedger(selectedItem);
}
});

async function loadItems(){

const result = await inventoryOfflineRequest(
"inventory-active-items-v2",
"/api/inventory/getActiveItems/"
);

if(result.success){
setItems(result.data || []);
}

}

async function loadLedger(itemId){

const result = await inventoryOfflineRequest(
`inventory-stock-ledger-v2-${itemId}`,
"/api/inventory/getStockLedger/",
{
body:{
item_id:itemId
}
}
);

if(result.success){
setLedger(result.data || []);
}

}

function selectItem(e){

const id = e.target.value;

setSelectedItem(id);

if(id){
loadLedger(id);
}

}

return(

<Layout title={t("stockLedger")}>

<section className={styles.heroSection}>
<div>
<p className={styles.eyebrow}>{t("inventory")}</p>
<h1 className={styles.heroTitle}>{t("stockLedger")}</h1>
<p className={styles.heroSubtitle}>{t("stockLedgerSubtitle")}</p>
</div>
</section>

<select
value={selectedItem}
onChange={selectItem}
className={styles.searchInput}
>

<option value="">{t("selectItem")}</option>

{items.map(i=>(
<option key={i.id} value={i.id}>
{i.item_name}
</option>
))}

</select>

<table className={tableStyles.table}>

<thead>

<tr>
<th>{t("date")}</th>
<th>{t("type")}</th>
<th>{t("quantity")}</th>
<th>{t("notes")}</th>
</tr>

</thead>

<tbody>

{ledger.map(l=>(
<tr key={l.id}>

<td>
{new Date(l.created_at).toLocaleDateString()}
</td>

<td>{l.transaction_type}</td>

<td>{l.quantity}</td>

<td>{l.notes || "-"}</td>

</tr>
))}

</tbody>

</table>

</Layout>

);

}
