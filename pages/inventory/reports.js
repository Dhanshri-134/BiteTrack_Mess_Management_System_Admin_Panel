import { useLanguage } from "../../context/LanguageContext";
import Layout from "../../components/Layout";

export default function Reports(){
  const { t } = useLanguage();


return(

<Layout title={t("inventoryReports")}>

<h2>{t("inventoryReports")}</h2>

<ul>

<li>{t("stockSummary")}</li>
<li>{t("lowStockReport")}</li>
<li>{t("purchaseReport")}</li>
<li>{t("usageReport")}</li>

</ul>

</Layout>

);

}