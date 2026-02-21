

import { useEffect, useState } from "react";
import styles from "../../styles/menupreview.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useAppRefresh } from "@/lib/useAppRefresh";


export default function MenuPreview() {
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const [openDay, setOpenDay] = useState(null);
  
  
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  
  const mealTypes = ["Breakfast", "Lunch", "Dinner"];
  
  useEffect(() => {
    async function fetchMenu() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Unauthorized — login required");
        
        const data = await offlineFetch("menuPreview", async () => {
          const res = await fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/menu/fetch/",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) throw new Error("Failed to fetch menu");
          return await res.json();
        });
        
        setMenuData(data || {});
      } catch (err) {
        console.error("fetchMenu error:", err);
        toast.error(t("somethingWentWrong"));
        setMenuData({});
      } finally {
        setLoading(false);
      }
    }
    
    fetchMenu();
  }, []);
  
  useAppRefresh(fetchMenu);
  // if (loading) {
  //   return <p className={styles.loading}>{t("loadingMenu")}</p>;
  // }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>{t("weeklyMenu")}</h2>
        <p>{t("weeklyMenuSubtitle")}</p>
      </div>

      {/* Day cards */}
      <div className={styles.daysWrapper}>
        {daysOfWeek.map((day) => (
          <div key={day} className={styles.dayCard}>
            <div
              className={styles.dayTitle}
              onClick={() => setOpenDay(openDay === day ? null : day)}
            >
              <span>{t(day)}</span>
              <span className={styles.chevron}>
                {openDay === day ? "▲" : "▼"}
              </span>
            </div>
            <div
              className={`${styles.accordionBody} ${openDay === day ? styles.open : ""
                }`}>
              {mealTypes.map((meal) => (
                <div
                  key={meal}
                  className={`${styles.mealCard} ${styles[meal.toLowerCase()]}`}
                >

                  <h3>{t(meal)}</h3>

                  {menuData[day]?.[meal]?.length ? (
                    <ul>
                      {menuData[day][meal].map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className={styles.noData}>
                      {t("noItemsAdded")}
                    </span>
                  )}
                </div>
              ))}
            </div>
            </div>
        ))} 
          </div>
    </div>
      );
}
