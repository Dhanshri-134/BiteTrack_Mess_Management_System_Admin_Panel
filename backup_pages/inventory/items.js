import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import styles from "../../styles/inventory.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";

export default function Items() {
  const router = useRouter();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  useAppRefresh(loadItems);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.item_name, item.category_name, item.unit]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [items, search]);

  async function loadItems() {
    try {
      setLoading(true);
      setError("");
      const result = await inventoryOfflineRequest(
        "inventory-stock-summary-v2",
        "/api/inventory/getStockSummary/"
      );
      if (result.success) setItems(result.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title={t("itemsLabel")}>
      <section className={styles.heroSection}>
        <div>
          <p className={styles.eyebrow}>{t("inventory")}</p>
                    <div className={styles.header}>
          
          <h1 className={styles.heroTitle}>{t("itemsLabel")}</h1>
                      <button
                        className={styles.backbtn}
                        onClick={() => router.back()}
                      >
                        ← Back
                      </button>
                    </div>
          {/* <p className={styles.heroSubtitle}>{t("itemsSubtitle")}</p> */}
        </div>
      </section>

      <section className={styles.infoGrid}>
        <div>
          <span>{t("itemsLabel")}</span>
          <strong>{items.length}</strong>
        </div>
        <div>
          <span>{t("lowStock")}</span>
          <strong>{items.filter((item) => Number(item.current_stock || 0) <= Number(item.min_stock || 0)).length}</strong>
        </div>
      </section>

      <section className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder={t("searchItems")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      {loading ? (
        <p>{t("loadingItems")}</p>
      ) : (
        <div className={styles.cardGrid}>
          {filtered.length === 0 ? <p>{t("noActiveItems")}</p> : null}
          {filtered.map((item) => (
            <div
              key={item.id}
              className={styles.itemCard}
              onClick={() => router.push(`/inventory/items/${item.id}`)}
            >
              <h3>{item.item_name}</h3>
              <p>
                {t("stock")}: {item.current_stock} {item.unit}
              </p>
              <p>
                Min: {Number(item.min_stock || 0)} {item.unit}
              </p>
              <p className={styles.desc}>
                {item.category_name || t("uncategorized")}
              </p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
