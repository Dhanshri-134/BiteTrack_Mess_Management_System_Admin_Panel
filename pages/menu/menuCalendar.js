import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/menuCalendar.module.css";
import { useLanguage } from "../../context/LanguageContext";
import { offlineFetch } from "../../lib/offlineFetch";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { API_BASE } from "../../lib/api";
import { X } from "lucide-react";

export default function MenuCalendar() {

  const { t } = useLanguage();
  const [menu, setMenu] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchMenu = async () => {
    const token = localStorage.getItem("token");

    const data = await offlineFetch(`menu-history-${year}-${month}`, async () => {
      const res = await fetch(
        `${API_BASE}/api/menu/monthly-history/?month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch menu history");
      }

      return res.json();
    });

    setMenu(data?.days || []);
  };

  useEffect(() => {
    fetchMenu();
  }, [month, year]);

  useAppRefresh(fetchMenu);

  // ✅ FIXED CALENDAR
  const getCalendarDays = () => {
    const days = [];

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const startDayIndex = firstDay.getDay();

    for (let i = 0; i < startDayIndex; i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month - 1, d));
    }

    return days;
  };

  // ✅ FIXED DATE MATCH
  const getMenuForDate = (date) => {
    const formatted = date.toLocaleDateString("en-CA"); // 🔥 FIX

    const found = menu.find(m => m.date === formatted);

    return found?.meals || {
      Breakfast: [],
      Lunch: [],
      Dinner: []
    };
  };

  const monthLabel = useMemo(
    () =>
      new Date(year, month - 1, 1).toLocaleString("en-IN", {
        month: "long",
        year: "numeric"
      }),
    [month, year]
  );

  const changeMonth = (offset) => {
    const nextDate = new Date(year, month - 1 + offset, 1);
    setMonth(nextDate.getMonth() + 1);
    setYear(nextDate.getFullYear());
  };

  const getMealCount = (meals) =>
    ["Breakfast", "Lunch", "Dinner"].reduce(
      (count, key) => count + ((meals?.[key] || []).length > 0 ? 1 : 0),
      0
    );

  const days = getCalendarDays();

  return (
  
      <div className={styles.container}>

        <h1 className={styles.title}>🍽️{t("menuCalendar")}</h1>

        <div className={styles.titleClone}>{t("menuCalendar")}</div>

        {/* HEADER */}
        <div className={styles.header}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => changeMonth(-1)}
          >
            ⬅
          </button>

          <div className={styles.monthTitleWrap}>
            <h2 className={styles.monthTitle}>{monthLabel}</h2>
            <span className={styles.monthHint}>{menu.length} menu days saved</span>
          </div>

          <button
            type="button"
            className={styles.navButton}
            onClick={() => changeMonth(1)}
          >
            ➡
          </button>
        </div>

        {/* GRID */}
        <div className={styles.gridShell}>
        <div className={styles.grid}>
          {["sun","mon","tue","wed","thu","fri","sat"].map(d => (
            <div key={d} className={styles.dayHeader}>{t(d)}</div>
          ))}

          {days.map((date, i) => {

            if (!date) {
              return <div key={i} className={styles.emptyCell}></div>;
            }

            const meals = getMenuForDate(date);
            const isToday =
              new Date().toDateString() === date.toDateString();

            const mealCount = getMealCount(meals);

            return (
              <button
                type="button"
                key={i}
                className={`${styles.card} ${isToday ? styles.today : ""} ${mealCount > 0 ? styles.hasMeals : styles.noMeals}`}
                onClick={() => {
                  setSelectedDay({ date, meals });
                }}
              >
                <div className={styles.date}>
                  {date.getDate()}
                </div>
                <span className={styles.mon}>
                  {new Date(year, month - 1).toLocaleString("en-IN", {
                    month: "short"
                  })}
                </span>
                <span className={styles.mealCount}>
                  {mealCount > 0 ? `${mealCount} meals` : "No menu"}
                </span>
              </button>
            );
          })}
        </div>

        

      </div>

      {/* MODAL */}
      {selectedDay && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDay(null)}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3>{selectedDay.date.toLocaleDateString("en-IN")}</h3>
                <p>{monthLabel}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedDay(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.mealSection}>
                <span className={styles.mealTitle}>{t("Breakfast")}</span>
                <p className={styles.mealValue}>{selectedDay.meals.Breakfast?.join(", ") || "-"}</p>
              </div>
              <div className={styles.mealSection}>
                <span className={styles.mealTitle}>{t("Lunch")}</span>
                <p className={styles.mealValue}>{selectedDay.meals.Lunch?.join(", ") || "-"}</p>
              </div>
              <div className={styles.mealSection}>
                <span className={styles.mealTitle}>{t("Dinner")}</span>
                <p className={styles.mealValue}>{selectedDay.meals.Dinner?.join(", ") || "-"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
