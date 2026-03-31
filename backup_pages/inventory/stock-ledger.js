import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import tableStyles from "../../styles/inventory.module.css";
import DayDropdown from "../../components/DayDropdown";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";
import router from "next/router"

export default function StockLedger() {

    const { t } = useLanguage();
    const [items, setItems] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [selectedItem, setSelectedItem] = useState("");

    useEffect(() => {
        loadItems();
    }, []);

    useAppRefresh(() => {
        loadItems();
        if (selectedItem) {
            loadLedger(selectedItem);
        }
    });

    async function loadItems() {
        const result = await inventoryOfflineRequest(
            "inventory-active-items-v2",
            "/api/inventory/getActiveItems/"
        );
        if (result.success) {
            setItems(result.data || []);
        }
    }

    async function loadLedger(itemId) {
        const result = await inventoryOfflineRequest(
            `inventory-stock-ledger-v2-${itemId}`,
            "/api/inventory/getStockLedger/",
            {
                body: {
                    item_id: itemId
                }
            }
        );
        if (result.success) {
            setLedger(result.data || []);
        }
    }

    function selectItem(id) {
        setSelectedItem(id);
        if (id) {
            loadLedger(id);
        } else {
            setLedger([]);
        }
    }

    const itemOptions = [
        { value: "", label: t("selectItem") },
        ...items.map((item) => ({
            value: String(item.id),
            label: item.item_name,
        })),
    ];

    return (
        <Layout title={t("stockLedger")}>
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
                    <h1 className={styles.heroTitle}>{t("stockLedger")}</h1>
                    {/* <p className={styles.heroSubtitle}>{t("stockLedgerSubtitle")}</p> */}
                </div>
            </section>

            <div className={styles.toolbar}>
                <div className={styles.filterCard}>
                    <label className={styles.filterLabel}>{t("selectItem")}</label>
                    <DayDropdown
                        options={itemOptions}
                        value={selectedItem}
                        onChange={selectItem}
                    />
                </div>
            </div>

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

                    {ledger.map(l => (
                        <tr key={l.id}>
                            <td data-label={t("date")}>
                                {new Date(l.created_at).toLocaleDateString()}
                            </td>
                            <td data-label={t("type")}>
                                {l.transaction_type}
                            </td>
                            <td data-label={t("quantity")}>
                                {l.quantity}
                            </td>
                            <td data-label={t("notes")}>
                                {l.notes || "-"}
                            </td>
                            </tr>
                    ))}

                </tbody>

            </table>

        </Layout>

    );

}
