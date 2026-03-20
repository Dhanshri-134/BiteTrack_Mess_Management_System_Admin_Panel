import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/inventory.module.css";
import StockLedger from "./[id]/stock-ledger";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";

export default function ItemPage() {

    const router = useRouter();
    const { id } = router.query;
    const { t } = useLanguage();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showAddStock, setShowAddStock] = useState(false);
    const [showUseStock, setShowUseStock] = useState(false);
    const [showAdjust, setShowAdjust] = useState(false);

    const [useQty, setUseQty] = useState("");
    const [useNotes, setUseNotes] = useState("");


    const [adjustQty, setAdjustQty] = useState("");
    const [adjustReason, setAdjustReason] = useState("");

    const [vendor, setVendor] = useState("");
    const [invoice, setInvoice] = useState("");
    const [qty, setQty] = useState("");
    const [price, setPrice] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!router.isReady) return;
        loadItem();
    }, [router.isReady, id]);

    useAppRefresh(() => {
        if (router.isReady && id) loadItem();
    });


    async function saveAdjustment() {

        try {
            setError("");
            await inventoryRequest("/api/inventory/adjustStock/", {
                body: {
                    item_id: id,
                    adjustment_quantity: adjustQty,
                    reason: adjustReason
                }
            });
            setShowAdjust(false);
            setAdjustQty("");
            setAdjustReason("");
            loadItem();

        } catch (err) {
            console.error(err);
            setError(err.message);
        }

    }

    async function loadItem() {

        try {
            setError("");
            const result = await inventoryOfflineRequest(
                `inventory-item-stock-v2-${id}`,
                "/api/inventory/getItemStock/",
                { body: { item_id: id } }
            );

            if (result.success) {
                setItem(result.data);
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }

    }

    async function saveUsage() {

        try {
            setError("");
            await inventoryRequest("/api/inventory/useStock/", {
                body: {
                    item_id: id,
                    quantity: useQty,
                    notes: useNotes
                }
            });
            setShowUseStock(false);
            setUseQty("");
            setUseNotes("");
            loadItem();

        } catch (err) {
            console.error(err);
            setError(err.message);
        }

    }

    async function saveStock() {

        try {
            setError("");
            await inventoryRequest("/api/inventory/addStock/", {
                body: {
                    item_id: id,
                    vendor_name: vendor,
                    invoice_number: invoice,
                    quantity: qty,
                    unit_price: price,
                    notes: notes
                }
            });
            setShowAddStock(false);
            setVendor("");
            setInvoice("");
            setQty("");
            setPrice("");
            setNotes("");
            loadItem();

        } catch (err) {
            console.error(err);
            setError(err.message);
        }

    }

    if (loading) {
        return <Layout title={t("item")}><p>{t("loading")}</p></Layout>;
    }

    return (

        <Layout title={item?.item_name || t("item")}>

            <section className={styles.heroSection}>

                <div>
                    <p className={styles.eyebrow}>{t("inventory")}</p>
                    <h1 className={styles.heroTitle}>{item.item_name}</h1>
                    <p className={styles.heroSubtitle}>{t("itemDetailsSubtitle")}</p>
                </div>

                <button
                    className={styles.secondaryBtn}
                    onClick={() => router.back()}
                >
                    ← Back
                </button>

            </section>

            <section className={styles.infoGrid}>
                <div>
                    <span>{t("stock")}</span>
                    <strong>{item.stock} {item.unit}</strong>
                </div>
                <div>
                    <span>{t("unit")}</span>
                    <strong>{item.unit}</strong>
                </div>
            </section>

            {error ? <p className={styles.errorText}>{error}</p> : null}

            <div className={styles.stockBox}>

                <h3>{t("currentStock")}</h3>

                <p className={styles.stockValue}>
                    {item.stock} {item.unit}
                </p>

            </div>

            <div className={styles.operations}>
                <button
                    className={styles.primaryBtn}
                    onClick={() => setShowAddStock(true)}
                >
                    {t("addStock")}
                </button>

                <button
                    className={styles.secondaryBtn}
                    onClick={() => setShowUseStock(true)}
                >
                    {t("useStock")}
                </button>

                <button
                    className={styles.secondaryBtn}
                    onClick={() => setShowAdjust(true)}
                >
                    {t("adjustStock")}
                </button>


            </div>


            <StockLedger />

            {showAddStock && (

                <div className={styles.modalOverlay}>

                    <div className={styles.modalCard}>

                        <h3>{t("addStock")}</h3>

                        <input
                            placeholder={t("vendorName")}
                            value={vendor}
                            onChange={(e) => setVendor(e.target.value)}
                        />

                        <input
                            placeholder={t("invoice")}
                            value={invoice}
                            onChange={(e) => setInvoice(e.target.value)}
                        />

                        <input
                            type="number"
                            placeholder={t("quantity")}
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                        />

                        <input
                            type="number"
                            placeholder={t("unitPrice")}
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />

                        <textarea
                            placeholder={t("notes")}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />


                        <div className={styles.modalActions}>

                            <button
                                className={styles.secondaryBtn}
                                onClick={() => setShowAddStock(false)}
                            >
                                {t("cancel")}
                            </button>

                            <button
                                className={styles.primaryBtn}
                                onClick={saveStock}
                            >
                                {t("save")}
                            </button>

                        </div>

                    </div>

                </div>

            )}

            {showUseStock && (

                <div className={styles.modalOverlay}>

                    <div className={styles.modalCard}>

                        <h3>{t("useStock")}</h3>

                        <input
                            type="number"
                            placeholder={t("quantityUsed")}
                            value={useQty}
                            onChange={(e) => setUseQty(e.target.value)}
                        />

                        <textarea
                            placeholder={t("usageReason")}
                            value={useNotes}
                            onChange={(e) => setUseNotes(e.target.value)}
                        ></textarea>

                        <div className={styles.modalActions}>

                            <button
                                className={styles.secondaryBtn}
                                onClick={() => setShowUseStock(false)}
                            >
                                {t("cancel")}
                            </button>

                            <button
                                className={styles.primaryBtn}
                                onClick={saveUsage}
                            >
                                {t("recordUsage")}
                            </button>


                        </div>

                    </div>

                </div>

            )}


            {showAdjust && (

                <div className={styles.modalOverlay}>

                    <div className={styles.modalCard}>

                        <h3>{t("adjustStock")}</h3>

                        <input
                            type="number"
                            placeholder={t("adjustmentQuantity")}
                            value={adjustQty}
                            onChange={(e) => setAdjustQty(e.target.value)}
                        />

                        <textarea
                            placeholder={t("reason")}
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                        ></textarea>



                        <div className={styles.modalActions}>

                            <button
                                className={styles.secondaryBtn}
                                onClick={() => setShowAdjust(false)}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                className={styles.primaryBtn}
                                onClick={saveAdjustment}
                            >
                                {t("adjustStock")}
                            </button>

                        </div>

                    </div>

                </div>

            )}
        </Layout>

    );

}
