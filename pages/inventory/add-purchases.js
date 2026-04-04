import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import DayDropdown from "../../components/DayDropdown";
import styles from "../../styles/inventory.module.css";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import DateField from "@/components/DateField";

export default function AddPurchase() {
  const router = useRouter();
  const { t } = useLanguage();
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [vendor, setVendor] = useState("");
  const [invoice, setInvoice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([{ item_id: "", quantity: "", price: "" }]);

  useEffect(() => {
    loadVendors();
    loadItems();
  }, []);

  useAppRefresh(() => {
    loadVendors();
    loadItems();
  });

  async function loadVendors() {
    const result = await inventoryOfflineRequest(
      "inventory-vendors",
      "/api/inventory/getVendors/"
    );
    if (result.success) {
      setVendors(result.data || []);
    }
  }

  async function loadItems() {
    const result = await inventoryOfflineRequest(
      "inventory-items-all",
      "/api/inventory/getItems/"
    );
    if (result.success) {
      setItems(result.data || []);
    }
  }

  function addRow() {
    setRows((prev) => [...prev, { item_id: "", quantity: "", price: "" }]);
  }

  function updateRow(index, field, value) {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function removeRow(index) {
    setRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function totalAmount() {
    return rows.reduce(
      (sum, row) => sum + Number(row.quantity || 0) * Number(row.price || 0),
      0
    );
  }

  async function savePurchase() {
    if (!vendor) {
      setError("Select a vendor.");
      return;
    }

    const validRows = rows.filter(
      (row) =>
        row.item_id && Number(row.quantity) > 0 && Number(row.price) >= 0
    );

    if (validRows.length === 0) {
      setError("Add at least one valid item row.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const result = await inventoryRequest("/api/inventory/addPurchase/", {
        body: {
          vendor_id: vendor,
          invoice_number: invoice,
          purchase_date: purchaseDate,
          notes,
          items: validRows,
        },
      });

      if (result.success) {
        toast.success(t("purchaseSaved") || "Purchase saved");
        setRows([{ item_id: "", quantity: "", price: "" }]);
        setVendor("");
        setInvoice("");
        setPurchaseDate("");
        setNotes("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const vendorOptions = [
    { value: "", label: t("selectVendor") },
    ...vendors.map((vendorItem) => ({
      value: String(vendorItem.id),
      label: vendorItem.vendor_name,
    })),
  ];

  const itemOptions = [
    { value: "", label: t("selectItem") },
    ...items.map((item) => ({
      value: String(item.id),
      label: item.item_name,
    })),
  ];

  return (
    <Layout title={t("addPurchase")}>
      <section className={styles.heroSection}>
        <div>
          <div className={styles.header}>
            <p className={styles.eyebrow}>{t("inventory")}</p>
            <button className={styles.backbtn} onClick={() => router.back()}>
              ← {t("Back")}
            </button>
          </div>
          <h1 className={styles.heroTitle}>{t("addPurchases")}</h1>
        </div>
      </section>

      <div className={styles.formCard}>
        <div className={styles.formCardHeader}>
          <div>
            <h3 className={styles.formCardTitle}>{t("addPurchases")}</h3>
            {/* <p className={styles.formCardText}>
              Fill vendor details, add purchase rows, and save everything from
              one clean form.
            </p> */}
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t("vendor")}</label>
            <DayDropdown
              options={vendorOptions}
              value={vendor}
              onChange={setVendor}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t("invoice")}</label>
            <input
              className={styles.formControl}
              placeholder={t("invoiceNumber")}
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t("date")}</label>
            <DateField value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>{t("notes")}</label>
            <textarea
              className={styles.formControl}
              placeholder={t("notes")}
              value={notes}
              rows={0}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("item")}</th>
            <th>{t("quantity")}</th>
            <th>{t("price")}</th>
            <th>{t("total")}</th>
            <th>{t("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td >
                <DayDropdown
                  options={itemOptions}
                  value={String(row.item_id || "")}
                  onChange={(value) => updateRow(index, "item_id", value)}
                />
              </td>

              <td>
                <input
                  className={styles.formControl}
                  type="number"
                  min="0"
                  value={row.quantity}
                  placeholder={t("quantity")}
                  onChange={(e) => updateRow(index, "quantity", e.target.value)}
                />
              </td>

              <td>
                <input
                  className={styles.formControl}
                  type="number"
                  min="0"
                  value={row.price}
                  placeholder={t("price")}
                  onChange={(e) => updateRow(index, "price", e.target.value)}
                />
              </td>

              <td data-label={t("total")}>Rs {Number(row.quantity || 0) * Number(row.price || 0)}</td>

              <td data-label={t("actions")}>
                <button
                  className={styles.secondaryBtn}
                  onClick={() => removeRow(index)}
                  disabled={saving}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.inlineActions}>
        <button
          className={styles.secondaryBtn}
          onClick={addRow}
          disabled={saving}
        >
          + Add Item
        </button>

        <div className={styles.totalBox}>Total: Rs {totalAmount()}</div>

        <button
          className={styles.primaryBtn}
          onClick={savePurchase}
          disabled={saving}
        >
          {saving ? t("saving") : "Save Purchase"}
        </button>
      </div>
    </Layout>
  );
}
