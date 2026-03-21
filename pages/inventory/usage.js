import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";
import router from "next/router";

export default function Usage() {

    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [rows, setRows] = useState([
        { item_id: "", quantity: "" }
    ]);
    const [usageList, setUsageList] = useState([]);
    const [date, setDate] = useState("");
    const [error, setError] = useState("");

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

        const validItems = rows.filter(r => r.item_id && r.quantity);

        if (validItems.length === 0) {
            setError(t("addAtLeastOneItem"));
            return;
        }

        setError("");

        const result = await inventoryRequest("/api/inventory/addUsage/", {
            body: {
                usage_date: date,
                items: validItems
            }
        });

        if (result.success) {

            alert(t("usageRecorded"));
            loadUsage();
            setRows([{ item_id: "", quantity: "" }]);
            setDate("");

        } else {
            setError(result.error);
        }

    }

    return (

        <Layout title={t("usage")}>

            <section className={styles.heroSection}>
                <div>
                    <p className={styles.eyebrow}>{t("inventory")}</p>
                    <div className={styles.header}>
                    
                    <h1 className={styles.heroTitle}>{t("recordUsage")}</h1>
                                <button
                                  className={styles.secondaryBtn}
                                  onClick={() => router.back()}
                                >
                                  ← Back
                                </button>
                              </div>
                    <p className={styles.heroSubtitle}>{t("usageSubtitle")}</p>
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

            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />

            <table className={styles.table}>

                <thead>

                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
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

                                    <option value="">{t("selectItem")}</option>

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

                                <button onClick={() => removeRow(i)}>
                                    {t("remove")}
                                </button>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>
<br></br>
<div style={{display: "flex", gap:"20px"}}>
    
            <button
                className={styles.secondaryBtn}
                onClick={addRow}
                >
                {t("addItem")}
            </button>

            <button
                className={styles.primaryBtn}
                onClick={saveUsage}
            >
                {t("saveUsage")}
            </button>
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
                            <td>{new Date(u.usage_date).toLocaleDateString()}</td>
                            <td>
                                {u.items.map((it, i) => (
                                    <div key={i}>
                                        {it.item_name} - {it.quantity} {it.unit}
                                    </div>
                                ))}
                            </td>
                            <td>{u.notes || "-"}</td>
                        </tr>
                    ))}

                </tbody>

            </table>

        </Layout>

    );

}
