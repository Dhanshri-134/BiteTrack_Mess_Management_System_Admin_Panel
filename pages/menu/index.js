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

export default function MenuPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("MenuManagement");
  const { t } = useLanguage();

  const tabs = [
    { key: "MenuManagement", label: t("menuManagement") },
    { key: "MenuPreview", label: t("menuPreview") },
    { key: "Specials", label: t("specialDishes") },
    { key: "RatingsReviews", label: t("ratingsReviews") },
    { key: "FastingRequests", label: t("fastingRequests") },
  ];

  // Set initial tab based on URL param
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabs.some((t) => t.key === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

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
            {activeTab === "Specials" && <SpecialDish />}
            {activeTab === "RatingsReviews" && <RatingsReviews />}
            {activeTab === "FastingRequests" && <FastingRequests />}
          </div>
        </main>
      </div>
    </Layout>
  );
}
