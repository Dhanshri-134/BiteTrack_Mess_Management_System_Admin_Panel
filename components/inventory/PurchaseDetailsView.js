import { useLanguage } from "../../context/LanguageContext";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString()}`;
}

export default function PurchaseDetailsView({ purchase, items, error, onBack }) {
  const { t } = useLanguage();

  return (
    <Layout title={`Purchase: ${purchase?.vendor_name || "Details"}`}>
      <section className={styles.heroSection}>
        <div>
          <div className={styles.header}>
            <p className={styles.eyebrow}>{t("inventory")}</p>
            <button className={styles.backbtn} onClick={onBack}>
              Back
            </button>
          </div>
          <h1 className={styles.heroTitle}>{t("purchaseDetails")}</h1>
        </div>
      </section>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <section className={styles.infoGrid}>
        <div>
          <span>{t("vendor")}</span>
          <strong>{purchase?.vendor_name || "-"}</strong>
        </div>
        <div>
          <span>{t("invoice")}</span>
          <strong>{purchase?.invoice_number || "-"}</strong>
        </div>
        <div>
          <span>{t("date")}</span>
          <strong>{purchase?.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString() : "-"}</strong>
        </div>
        <div>
          <span>{t("total")}</span>
          <strong>{formatCurrency(purchase?.total_amount)}</strong>
        </div>
      </section>

      <div className={styles.formCard}>
        <div className={styles.formCardHeader}>
          <div>
            <h3 className={styles.formCardTitle}>{t("purchasedItems")}</h3>
            <p className={styles.formCardText}>
              {items.length} item{items.length === 1 ? "" : "s"} in this purchase.
            </p>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("item")}</th>
              <th>{t("qty")}</th>
              <th>{t("unit")}</th>
              <th>{t("unitPrice")}</th>
              <th>{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label={t("item")}>
                  <div className={styles.tablePrimaryValue}>{item.item_name}</div>
                </td>
                <td data-label={t("qty")}>{item.quantity}</td>
                <td data-label={t("unit")}>{item.unit}</td>
                <td data-label={t("unitPrice")}>{formatCurrency(item.unit_price)}</td>
                <td data-label={t("total")}>{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
