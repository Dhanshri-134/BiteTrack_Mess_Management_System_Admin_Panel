import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "../../context/LanguageContext";

export default function AddPurchase() {
    const [vendors, setVendors] = useState([]);
    const [items, setItems] = useState([]);
    const [vendor, setVendor] = useState("");
    const [invoice, setInvoice] = useState("");
    const [purchaseDate, setPurchaseDate] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [rows, setRows] = useState([
        { item_id: "", quantity: "", price: "" }
    ]);
    const {t} = useLanguage();

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
            setVendors(result.data);
        }
    }
    async function loadItems() {
        const result = await inventoryOfflineRequest(
            "inventory-items-all",
            "/api/inventory/getItems/"
        );
        if (result.success) {
            setItems(result.data);
        }
    }
    function addRow() {
        setRows([
            ...rows,
            { item_id: "", quantity: "", price: "" }
        ]);
    }
    function updateRow(index, field, value) {
        const copy = [...rows];
        copy[index][field] = value;
        setRows(copy);
    }
    function removeRow(index) {
        const copy = [...rows];
        copy.splice(index, 1);
        setRows(copy);
    }
    function totalAmount() {
        return rows.reduce((sum, r) => {
            return sum + (Number(r.quantity || 0) * Number(r.price || 0));
        }, 0);
    }
    async function savePurchase() {
        if (!vendor) {
            setError("Select a vendor.");
            return;
        }
        const validRows = rows.filter((row) => row.item_id && Number(row.quantity) > 0 && Number(row.price) >= 0);
        if (validRows.length === 0) {
            setError("Add at least one valid item row.");
            return;
        }
        setError("");
        try {
            const result = await inventoryRequest("/api/inventory/addPurchase/", {
                body: {
                    vendor_id: vendor,
                    invoice_number: invoice,
                    purchase_date: purchaseDate,
                    notes,
                    items: validRows
                }
            });
            if (result.success) {
                alert("Purchase saved");
                setRows([{ item_id: "", quantity: "", price: "" }]);
                setInvoice("");
                setPurchaseDate("");
                setNotes("");
            }
        } catch (err) {
            setError(err.message);
        }
    }
    return (
        <Layout title="Add Purchase">
      <section className={styles.heroSection}>
        <div>
          <p className={styles.eyebrow}>{t("inventory")}</p>
          <div className={styles.header}>

            <h1 className={styles.heroTitle}>{t("addPurchases")}</h1>
            <button
              className={styles.secondaryBtn}
              onClick={() => router.back()}
            >
              ← Back
            </button>
          </div>
          <p className={styles.heroSubtitle}>{t("vendorListSubtitle")}</p>
        </div>
        </section>

            <div className={styles.formGrid}>
                <select
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                            {v.vendor_name}
                        </option>
                    ))}
                </select>
                <input
                    placeholder="Invoice Number"
                    value={invoice}
                    onChange={(e) => setInvoice(e.target.value)}
                />
                <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                />
                <textarea
                    placeholder="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <td>
                                <select
                                    value={r.item_id}
                                    onChange={(e) => updateRow(i, "item_id", e.target.value)}
                                >
                                    <option value="">Select Item</option>
                                    {items.map(it => (
                                        <option key={it.id} value={it.id}>
                                            {it.item_name}
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={r.quantity}
                                    onChange={(e) => updateRow(i, "quantity", e.target.value)}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    value={r.price}
                                    onChange={(e) => updateRow(i, "price", e.target.value)}
                                />
                            </td>
                            <td>
                                ₹ {Number(r.quantity || 0) * Number(r.price || 0)}
                            </td>
                            <td>
                                <button onClick={() => removeRow(i)}>
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <br></br>
            <button
                className={styles.secondaryBtn}
                onClick={addRow}
            >
                + Add Item
            </button>
            <div className={styles.totalBox}>
                Total: ₹ {totalAmount()}
            </div>
            <button
                className={styles.primaryBtn}
                onClick={savePurchase}
            >
                Save Purchase
            </button>
        </Layout>
    );
}
