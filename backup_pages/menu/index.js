import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "../../components/Layout";
import MenuManagement from "./MenuManagement";
import MenuPreview from "./MenuPreview";
import SpecialDish from "./SpecialDish";
import RatingsReviews from "./RatingsReviews";
import FastingRequests from "./fasting";
import styles from "../../styles/menu.module.css";
import { useLanguage } from "../../context/LanguageContext";
import { offlineFetch } from "../../lib/offlineFetch";
import MenuCalendar from "./menuCalendar";
import { API_BASE } from "../../lib/api";

export default function MenuPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("MenuManagement");
  const { t } = useLanguage();
const [messAccess, setMessAccess] = useState(null);
const [loadingAccess, setLoadingAccess] = useState(true);

const hasAccess = (key) => {
  if (!messAccess) return true; // fallback safe
  return messAccess[key] !== false;
};
const tabs = [
  { key: "MenuManagement", label: t("menuManagement") },

  
  { key: "MenuPreview", label: t("menuPreview") },
  { key: "MonthlyMenu", label: t("monthlymenuHistory") },
  
  (hasAccess("special_menu") || hasAccess("cravings")) && {
    key: "Specials",
    label: t("specialDishes"),
  },

  hasAccess("fasting") && {
    key: "FastingRequests",
    label: t("fastingRequests"),
  },
].filter(Boolean);

  // Set initial tab based on URL param
useEffect(() => {
  const tabFromUrl = searchParams.get("tab");

  if (tabFromUrl) {
    setActiveTab(tabFromUrl);
  }
}, []); // 🔥 only run once

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const fetchAccess = async () => {
    try {
      const data = await offlineFetch("mess-access", async () => {
        const res = await fetch(
          `${API_BASE}/api/mess/access/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Failed to fetch access");
        return res.json();
      });

      setMessAccess(data || {});
    } catch (err) {
      console.error("Access unavailable offline");
      setMessAccess({});
    } finally {
      setLoadingAccess(false);
    }
  };

  fetchAccess();
}, []);

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          {/* Tabs */}
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.tabButton} ${
                  activeTab === tab.key ? styles.activeTab : ""
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className={styles.tabContent}>
            {activeTab === "MenuManagement" && <MenuManagement />}
            {activeTab === "MenuPreview" && <MenuPreview />}
            {activeTab === "Specials" && (
  <SpecialDish messAccess={messAccess} />
)}
            {activeTab === "MonthlyMenu" && <MenuCalendar />}
            {activeTab === "FastingRequests" && hasAccess("fasting") && (
  <FastingRequests />
)}
          </div>
        </main>
      </div>
    </Layout>
  );
}
