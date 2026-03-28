import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/inventory.module.css";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";

export default function CategoryItems() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [error, setError] = useState("");
  const [itemForm, setItemForm] = useState({
    item_name: "",
    unit: "",
    description: "",
  });

  useEffect(() => {
    if (!router.isReady) return;
    loadItems();
  }, [router.isReady, id]);

  useAppRefresh(() => {
    if (router.isReady && id) loadItems();
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.item_name, item.unit, item.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [items, search]);

  async function addItem() {
    if (!itemForm.item_name.trim() || !itemForm.unit.trim()) {
      setError(t("itemNameAndUnitRequired"));
      return;
    }

    try {
      setError("");
      await inventoryRequest("/api/inventory/addItem/", {
        body: {
          item_name: itemForm.item_name,
          unit: itemForm.unit,
          description: itemForm.description,
          category_id: id,
        },
      });

      setShowAddItem(false);
      setItemForm({ item_name: "", unit: "", description: "" });
      setSuggestions([]);
      await loadItems();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  async function fetchItemSuggestions(value) {
    try {
      const result = await inventoryRequest("/api/inventory/searchItems/", {
        body: { search: value, category_id: id },
      });
      if (result.success) setSuggestions(result.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadItems() {
    try {
      setLoading(true);
      setError("");
      const result = await inventoryOfflineRequest(
        `inventory-category-items-v2-${id}`,
        "/api/inventory/getCategoryItems/",
        { body: { category_id: id } }
      );

      if (result.success) {
        setItems(result.data || []);
        setCategoryName(result.category_name || t("category"));
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title={t("categoryItems")}>
      
      <section className={styles.heroSection}>
        <div>
          <div className={styles.header}>
          <p className={styles.eyebrow}>{t("inventory")}</p>
          
                      {/* <h1 className={styles.heroTitle}>{t("vendors")}</h1> */}
                      <button
                        className={styles.backbtn}
                        onClick={() => router.back()}
                      >
                        ← Back
                      </button>
                    </div>
          <h1 className={styles.heroTitle}>{categoryName || t("category")}</h1>
          {/* <p className={styles.heroSubtitle}>{t("categoryItemsSubtitle")}</p> */}
        </div>
      <section className={styles.catId}>
        <div >
          <span>{t("itemsLabel")}</span> :
          <strong> {items.length}</strong>
        </div>
        <button className={styles.addVbtn} onClick={() => setShowAddItem(true)}>
          + {t("addItem")}
        </button>
      </section>
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
          {filtered.length === 0 ? <p>{t("noItemsFound")}</p> : null}
          {filtered.map((item) => (
            <div
              key={item.id}
              className={styles.itemCard}
              onClick={() => router.push(`/inventory/items/${item.id}`)}
            >
              <h3>{item.item_name}</h3>
              <p>{t("unit")}: {item.unit}</p>
              {item.description ? <p className={styles.desc}>{item.description}</p> : null}
            </div>
          ))}
        </div>
      )}

      {showAddItem ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>{t("addItem")}</h3>
              <button className={styles.iconOnlyBtn} onClick={() => setShowAddItem(false)}>
                x
              </button>
            </div>

            <input
              placeholder={t("itemName")}
              value={itemForm.item_name}
              onChange={(e) => {
                const value = e.target.value;
                setItemForm({ ...itemForm, item_name: value });
                fetchItemSuggestions(value);
              }}
            />

            {suggestions.length > 0 ? (
              <div className={styles.suggestionsBox}>
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={styles.suggestionItem}
                    onClick={() => {
                      setItemForm({
                        ...itemForm,
                        item_name: suggestion.item_name,
                        unit: suggestion.unit,
                        description: suggestion.description || "",
                      });
                      setSuggestions([]);
                    }}
                  >
                    {suggestion.item_name} ({suggestion.unit})
                  </div>
                ))}
              </div>
            ) : null}

            <input
              placeholder={t("unitPlaceholder")}
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
            />

            <textarea
              placeholder={t("description")}
              value={itemForm.description}
              onChange={(e) =>
                setItemForm({ ...itemForm, description: e.target.value })
              }
            />

            <div className={styles.modalActions}>
              <button className={styles.secondaryBtn} onClick={() => setShowAddItem(false)}>
                {t("cancel")}
              </button>
              <button className={styles.primaryBtn} onClick={addItem}>
                {t("createItem")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
