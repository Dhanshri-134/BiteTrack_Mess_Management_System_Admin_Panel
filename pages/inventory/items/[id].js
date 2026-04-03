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
    const [minStockValue, setMinStockValue] = useState("0");
    const [useQty, setUseQty] = useState("");
    const [useNotes, setUseNotes] = useState("");
    const [adjustQty, setAdjustQty] = useState("");
    const [adjustReason, setAdjustReason] = useState("");
    const [vendor, setVendor] = useState("");
    const [invoice, setInvoice] = useState("");
    const [qty, setQty] = useState("");
    const [price, setPrice] = useState("");
    const [notes, setNotes] = useState("");
    const [savingMinStock, setSavingMinStock] = useState(false);
    const [savingStock, setSavingStock] = useState(false);
    const [savingUsage, setSavingUsage] = useState(false);
    const [savingAdjustment, setSavingAdjustment] = useState(false);

    useEffect(() => {
        if (!router.isReady) return;
        loadItem();
    }, [router.isReady, id]);

    useAppRefresh(() => {
        if (router.isReady && id) loadItem();
    });

    async function saveAdjustment() {
        try {
            setSavingAdjustment(true);
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
        } finally {
            setSavingAdjustment(false);
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
                setMinStockValue(String(result.data?.min_stock ?? 0));
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
            setSavingUsage(true);
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
        } finally {
            setSavingUsage(false);
        }
    }
    async function saveStock() {
        try {
            setSavingStock(true);
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
        } finally {
            setSavingStock(false);
        }
    }
    async function saveMinStock() {
        try {
            setSavingMinStock(true);
            setError("");
            await inventoryRequest("/api/inventory/updateMinStock/", {
                body: {
                    item_id: id,
                    min_stock: Number(minStockValue || 0),
                }
            });
            
            await loadItem();
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setSavingMinStock(false);
        }
    }
    if (loading) {
        return <Layout title={t("item")}><p>{t("loading")}</p></Layout>;
    }
    return (
        <Layout title={item?.item_name || t("item")}>
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
                        <h1 className={styles.heroTitle}>{item.item_name}</h1>
                    {/* <p className={styles.heroSubtitle}>{t("itemDetailsSubtitle")}</p> */}
                </div>
            </section>

<br></br>
            {error ? <p className={styles.errorText}>{error}</p> : null}
{/* <div className={styles.stockcard}> */}

            <div className={styles.stockBox}>
                <h3>{t("currentStock")}</h3>
                <p className={styles.stockValue}>
                    {item.stock} {item.unit}
                </p>
            </div>
            <div className={styles.formCard}>
                <div className={styles.formCardHeader}>
                    <div>
                        <h3 className={styles.formCardTitle}>{t("minStock")}</h3>
                        <p className={styles.formCardText}>{t("setTheLowStockThresholdForThisItem")}</p>
                    </div>
                </div>
                <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{t("minimumStock")}</label>
                        <input
                            type="number"
                            min="0"
                            value={minStockValue}
                            onChange={(e) => setMinStockValue(e.target.value)}
                            className={styles.formControl}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{t("currentThreshold")}</label>
                        <div className={styles.readonlyValue}>{Number(item.min_stock || 0)} {item.unit}</div>
                    </div>
                </div>
                <button
                    className={styles.primaryBtn}
                    onClick={saveMinStock}
                    disabled={savingMinStock}
                >
                    {savingMinStock ? t("saving") : t("SaveMinStock")}
                </button>
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

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("vendorName")}</label>
                            <input
                                placeholder={t("vendorName")}
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("invoice")}</label>
                            <input
                                placeholder={t("invoice")}
                                value={invoice}
                                onChange={(e) => setInvoice(e.target.value)}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("quantity")}</label>
                            <input
                                type="number"
                                placeholder={t("quantity")}
                                value={qty}
                                onChange={(e) => setQty(e.target.value)}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("unitPrice")}</label>
                            <input
                                type="number"
                                placeholder={t("unitPrice")}
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("notes")}</label>
                            <textarea
                                placeholder={t("notes")}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>


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
                                disabled={savingStock}
                            >
                                {savingStock ? t("saving") : t("save")}
                            </button>

                        </div>

                    </div>

                </div>

            )}

            {showUseStock && (

                <div className={styles.modalOverlay}>

                    <div className={styles.modalCard}>

                        <h3>{t("useStock")}</h3>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("quantityUsed")}</label>
                            <input
                                type="number"
                                placeholder={t("quantityUsed")}
                                value={useQty}
                                onChange={(e) => setUseQty(e.target.value)}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("usageReason")}</label>
                            <textarea
                                placeholder={t("usageReason")}
                                value={useNotes}
                                onChange={(e) => setUseNotes(e.target.value)}
                            ></textarea>
                        </div>

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
                                disabled={savingUsage}
                            >
                                {savingUsage ? t("saving") : t("recordUsage")}
                            </button>


                        </div>

                    </div>

                </div>

            )}

            {showAdjust && (

                <div className={styles.modalOverlay}>

                    <div className={styles.modalCard}>

                        <h3>{t("adjustStock")}</h3>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("adjustmentQuantity")}</label>
                            <input
                                type="number"
                                placeholder={t("adjustmentQuantity")}
                                value={adjustQty}
                                onChange={(e) => setAdjustQty(e.target.value)}
                            />
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>{t("reason")}</label>
                            <textarea
                                placeholder={t("reason")}
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                            ></textarea>
                        </div>



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
                                disabled={savingAdjustment}
                            >
                                {savingAdjustment ? t("saving") : t("adjustStock")}
                            </button>

                        </div>

                    </div>

                </div>

            )}
        </Layout>

    );

}
