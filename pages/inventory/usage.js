import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";
import router from "next/router";
import toast from "react-hot-toast";
import DateField from "@/components/DateField";
import { formatDisplayDate } from "@/lib/dateFormat";

export default function Usage() {

    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [rows, setRows] = useState([
        { item_id: "", quantity: "" }
    ]);
    const [usageList, setUsageList] = useState([]);
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadItems();
        loadUsage();
    }, []);

    useAppRefresh(() => {
        loadItems();
        loadUsage();
    });

    async function loadUsage() {

        const result = await inventoryOfflineRequest(
            "inventory-usage-v2",
            "/api/inventory/getUsage/"
        );

        if (result.success) {
            setUsageList(result.data || []);
        }

    }
    async function loadItems() {

        const result = await inventoryOfflineRequest(
            "inventory-active-items-v2",
            "/api/inventory/getActiveItems/"
        );

        if (result.success) {
            setItems(result.data || []);
        }

    }

    function addRow() {

        setRows([...rows, { item_id: "", quantity: "" }]);

    }

    function updateRow(index, field, value) {

        const copy = [...rows];
        copy[index][field] = value;

        setRows(copy);

    }

    function removeRow(index) {

        if (rows.length === 1) return;

        const copy = [...rows];
        copy.splice(index, 1);

        setRows(copy);

    }

    async function saveUsage() {
        setSubmitting(true);
        try {

        const validItems = rows.filter(r => r.item_id && r.quantity);

            if (validItems.length === 0) {
                setError(t("addAtLeastOneItem"));
                return;
            }

            setError("");

            const result = await inventoryRequest("/api/inventory/addUsage/", {
                body: {
                    usage_date: date,
                    notes,
                    items: validItems
                }
            });

            if (result.success) {

                toast.success(t("usageRecorded"));
                loadUsage();
                setRows([{ item_id: "", quantity: "" }]);
                setDate("");
                setNotes("");

            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || t("somethingWentWrong"));
        } finally {
            setSubmitting(false);
        }

    }

    return (

        <Layout title={t("usage")}>

            <section className={styles.heroSection}>
                <div>
                    <div className={styles.header}>
                    
                    <p className={styles.eyebrow}>{t("inventory")}</p>
                                <button
                                  className={styles.backbtn}
                                  onClick={() => router.back()}
                                >
                                  ← Back
                                </button>
                              </div>
                    <h1 className={styles.heroTitle}>{t("recordUsage")}</h1>
                    {/* <p className={styles.heroSubtitle}>{t("usageSubtitle")}</p> */}
                </div>
            </section>

            <section className={styles.infoGrid}>
                <div>
                    <span>{t("itemsLabel")}</span>
                    <strong>{items.length}</strong>
                </div>
                <div>
                    <span>{t("usageHistory")}</span>
                    <strong>{usageList.length}</strong>
                </div>
            </section>
<br></br>
            {error && <p className={styles.errorText}>{error}</p>}

            <div className={styles.formCard}>
                <div className={styles.formCardHeader}>
                    <div>
                        <h3 className={styles.formCardTitle}>{t("recordUsage")}</h3>
                        {/* <p className={styles.formCardText}>Add date, select items, and record quantities in one place.</p> */}
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{t("date")}</label>
                        <DateField value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{t("notes")}</label>
                        <textarea
                            className={styles.formControl}
                            value={notes}
                            rows={3}
                            placeholder={t("optionalNote")}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t("item")}</th>
                            <th>{t("quantity")}</th>
                            <th>{t("actions")}</th>
                        </tr>
                    </thead>

                    <tbody>

                        {rows.map((r, i) => (
                            <tr key={i}  style={{paddingLeft : 0 }}>
                                <td >
                                    <select
                                        className={styles.formControl}
                                        value={r.item_id}
                                        onChange={(e) => updateRow(i, "item_id", e.target.value)}
                                    >
                                        <option value="">{t("selectItem")}</option>
                                        {items.map(it => (
                                            <option key={it.id} value={it.id}>
                                                {it.item_name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td >
                                    <input
                                        className={styles.formControl}
                                        type="number"
                                        min="0"
                                        value={r.quantity}
                                        placeholder={t("quantity")}
                                        onChange={(e) => updateRow(i, "quantity", e.target.value)}
                                    />
                                </td>
                                <td>
                                    <button className={styles.secondaryBtn} onClick={() => removeRow(i)} disabled={submitting}>
                                        {t("remove")}
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
                        disabled={submitting}
                    >
                        {t("addItem")}
                    </button>

                    <button
                        className={styles.primaryBtn}
                        onClick={saveUsage}
                        disabled={submitting}
                    >
                        {submitting ? t("saving") : t("saveUsage")}
                    </button>
                </div>
            </div>





            <h3 style={{ marginTop: "40px" }}>{t("usageHistory")}</h3>

            <table className={styles.table}>

                <thead>
                    <tr>
                        <th>{t("date")}</th>
                        <th>{t("itemsUsed")}</th>
                        <th>{t("notes")}</th>
                    </tr>
                </thead>

                <tbody>

                    {usageList.map(u => (
                        <tr key={u.id}>
                            <td data-label={t("date")}>{formatDisplayDate(u.usage_date)}</td>
                            <td data-label={t("itemsUsed")}>
                                {u.items.map((it, i) => (
                                    <div key={i}>
                                        {it.item_name} - {it.quantity} {it.unit}
                                    </div>
                                ))}
                            </td>
                            <td data-label={t("notes")}>{u.notes || "-"}</td>
                        </tr>
                    ))}

                </tbody>

            </table>

        </Layout>

    );

}
