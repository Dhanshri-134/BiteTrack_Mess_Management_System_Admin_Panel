import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/menuCalendar.module.css";
import { useLanguage } from "../../context/LanguageContext";
import { offlineFetch } from "../../lib/offlineFetch";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { API_BASE } from "../../lib/api";

export default function MenuCalendar() {

  const { t } = useLanguage();
  const [menu, setMenu] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      breakfast: [],
      lunch: [],
      dinner: []
    };
  };

  const days = getCalendarDays();

  return (
    <div>
      <div className={styles.container}>

        <h1 className={styles.title}>🍽️{t("menuCalendar")}</h1>

        {/* HEADER */}
        <div className={styles.header}>
          <button onClick={() => setMonth(prev => prev === 1 ? 12 : prev - 1)}>
            ⬅
          </button>

          <h2>
            {new Date(year, month - 1).toLocaleString("en-IN", {
              month: "long",
              year: "numeric"
            })}
          </h2>

          <button onClick={() => setMonth(prev => prev === 12 ? 1 : prev + 1)}>
            ➡
          </button>
        </div>

        {/* GRID */}
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

            return (
              <div
                key={i}
                className={`${styles.card} ${isToday ? styles.today : ""}`}
                onClick={() => {
                  setSelectedDay({ date, meals });
                  setShowModal(true);
                }}
              >
                <div className={styles.date}>
                  {date.getDate()}
                    </div>
                  <span className={styles.mon}>

                   {new Date(year, month - 1).toLocaleString("en-IN", {
                     month: "short"           })}
                     </span>
              </div>
            );
          })}
        </div>

        

      </div>

      {/* MODAL */}
      {showModal && selectedDay && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>

            <h3>
              {selectedDay.date.toLocaleDateString("en-IN")}
            </h3>

            <div className={styles.modalContent}>
              <p><span className={styles.subtitle}>{t("Breakfast")} </span> :  {selectedDay.meals.Breakfast?.join(", ") || "-"}</p>
              <p><span className={styles.subtitle}>{t("Lunch")} </span> : {selectedDay.meals.Lunch?.join(", ") || "-"}</p>
              <p><span className={styles.subtitle}>{t("Dinner")} </span> : {selectedDay.meals.Dinner?.join(", ") || "-"}</p>
            </div>

            <button onClick={() => setShowModal(false)}>
              {t("close")}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
