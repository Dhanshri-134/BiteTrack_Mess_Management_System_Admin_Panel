import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString()}`;
}

export default function PurchaseDetailsView({ purchase, items, error, onBack }) {
  return (
    <Layout title={`Purchase: ${purchase?.vendor_name || "Details"}`}>
      <section className={styles.heroSection}>
        <div>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Inventory</p>
            <button className={styles.backbtn} onClick={onBack}>
              Back
            </button>
          </div>
          <h1 className={styles.heroTitle}>Purchase Details</h1>
        </div>
      </section>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <section className={styles.infoGrid}>
        <div>
          <span>Vendor</span>
          <strong>{purchase?.vendor_name || "-"}</strong>
        </div>
        <div>
          <span>Invoice</span>
          <strong>{purchase?.invoice_number || "-"}</strong>
        </div>
        <div>
          <span>Date</span>
          <strong>{purchase?.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString() : "-"}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatCurrency(purchase?.total_amount)}</strong>
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

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td data-label="Item">
                  <div className={styles.tablePrimaryValue}>{item.item_name}</div>
                </td>
                <td data-label="Qty">{item.quantity}</td>
                <td data-label="Unit">{item.unit}</td>
                <td data-label="Unit Price">{formatCurrency(item.unit_price)}</td>
                <td data-label="Total">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
