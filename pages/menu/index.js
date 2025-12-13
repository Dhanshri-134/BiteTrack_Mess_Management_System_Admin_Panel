import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Sidebar from "../../components/Sidebar";
import MenuManagement from "./MenuManagement";
import MenuPreview from "./MenuPreview";
import SpecialDish from "./SpecialDish";
import RatingsReviews from "./RatingsReviews";
import FastingRequests from "./fasting";
import styles from "../../styles/menu.module.css"; 

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState("MenuManagement");

  const tabs = [
    { key: "MenuManagement", label: "Menu Management" },
    { key: "MenuPreview", label: "Menu Preview" },
    { key: "Specials", label: "Special Dishes" },
    { key: "RatingsReviews", label: "Ratings & Reviews" },
    { key: "FastingRequests", label: "Fasting Requests" },
  ];

  return (
    <Layout>
      <div className={styles.container}>
        <Sidebar /> {/* sidebar on the left */}
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

          {/* Tab Content */}
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
