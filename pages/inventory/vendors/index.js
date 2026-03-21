import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import styles from "../../../styles/inventory.module.css";
import { inventoryOfflineRequest, inventoryRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";
import { Plus } from "lucide-react";

const emptyForm = {
  vendor_name: "",
  phone: "",
  email: "",
  address: "",
  gst_number: "",
  notes: "",
};

export default function Vendors() {
  const router = useRouter();
  const { t } = useLanguage();
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadVendors();
  }, []);

  useAppRefresh(loadVendors);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vendors;

    return vendors.filter((vendor) =>
      [vendor.vendor_name, vendor.phone, vendor.email, vendor.gst_number]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [search, vendors]);

  async function loadVendors() {
    try {
      const result = await inventoryOfflineRequest(
        "inventory-vendors-v2",
        "/api/inventory/getVendors/"
      );

      if (result.success) {
        setVendors(result.data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  function openCreateModal() {
    setEditingVendor(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEditModal(vendor) {
    setEditingVendor(vendor);
    setForm({
      vendor_name: vendor.vendor_name || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      gst_number: vendor.gst_number || "",
      notes: vendor.notes || ""
    });
    setError("");
    setShowModal(true);
  }

  async function saveVendor() {
    if (!form.vendor_name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await inventoryRequest(
        editingVendor ? "/api/inventory/updateVendor/" : "/api/inventory/addVendor/",
        {
          body: editingVendor ? { vendor_id: editingVendor.id, ...form } : form
        }
      );

      setShowModal(false);
      setForm(emptyForm);
      setEditingVendor(null);
      await loadVendors();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (

    <Layout title={t("vendors")}>

      <section className={styles.heroSection}>
        <div>
          <p className={styles.eyebrow}>{t("inventory")}</p>
          <div className={styles.header}>

            <h1 className={styles.heroTitle}>{t("vendors")}</h1>
            <button
              className={styles.secondaryBtn}
              onClick={() => router.back()}
            >
              ← Back
            </button>
          </div>
          <p className={styles.heroSubtitle}>{t("vendorListSubtitle")}</p>
        </div>
        

        <button
          className={styles.addVbtn}
          onClick={openCreateModal}
        >
        +  {t("addVendor")}
        </button>

      </section>

      <section className={styles.infoGrid}>
        <div>
          <span>{t("vendors")}</span>
          <strong>{vendors.length}</strong>
        </div>
        <div>
          <span>{t("totalPurchases")}</span>
          <strong>Rs. {vendors.reduce((sum, v) => sum + Number(v.total_purchases || 0), 0).toLocaleString()}</strong>
        </div>
        <div>
          <span>{t("purchaseCount")}</span>
          <strong>{vendors.reduce((sum, v) => sum + Number(v.purchase_count || 0), 0)}</strong>
        </div>
        <div>
          <span>{t("itemsSupplied")}</span>
          <strong>{vendors.reduce((sum, v) => sum + Number(v.items_supplied || 0), 0)}</strong>
        </div>
      </section>

      <section className={styles.toolbar}>

        <input
          className={styles.searchInput}
          placeholder={t("searchVendor")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

      </section>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.cardGrid}>

        {filtered.map(v => (

          <div
            key={v.id}
            className={styles.vendorCard}
            onClick={() => router.push(`/inventory/vendors/${v.id}`)}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3>{v.vendor_name} </h3>
              <button
                onClick={(e) => { e.stopPropagation(); openEditModal(v); }}
                className={styles.secondaryBtn}
                style={{ padding: "4px 8px", fontSize: "12px", borderRadius: "6px" }}
              >
                {t( "Edit")}
              </button>
            </div>


            <div className={styles.vendorStats}>

            {/* {v.phone && <p>{v.phone}</p>} */}
              <p>
                <strong>Total Purchases:</strong> ₹{Number(v.total_purchases || 0).toLocaleString()}
              </p>

              <p>
                <strong>{t("itemsSupplied")}:</strong> {v.items_supplied || 0}
              </p>

              <p>
                <strong>{t("lastPurchase")}:</strong>
                {v.last_purchase
                  ? new Date(v.last_purchase).toLocaleDateString()
                  : t("noPurchasesFound")}
              </p>

            </div>


          </div>
        ))}

      </div>
      {showModal && (

        <div className={styles.modalOverlay}>

          <div className={styles.modalCard}>

            <h3>{editingVendor ? t("editVendor") : t("addVendor")}</h3>

            <input
              placeholder={t("vendorName")}
              value={form.vendor_name}
              onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
            />

            <input
              placeholder={t("phone")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <input
              placeholder={t("email")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              placeholder={t("gstNumber")}
              value={form.gst_number}
              onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
            />

            <textarea
              placeholder={t("address")}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <textarea
              placeholder={t("notes")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className={styles.modalActions}>

              <button
                className={styles.secondaryBtn}
                onClick={() => setShowModal(false)}
              >
                {t("cancel")}
              </button>

              <button
                className={styles.primaryBtn}
                onClick={saveVendor}
              >
                {saving ? t("saving") : editingVendor ? t("updateVendor") : t("createVendor")}
              </button>

            </div>

          </div>

        </div>

      )}

    </Layout>

  );

}
