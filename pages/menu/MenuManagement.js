


import { useState, useEffect } from "react";
import styles from "../../styles/menu.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import DayDropdown from "../../components/DayDropdown";
import { useLanguage } from "../../context/LanguageContext";
import { useAppRefresh } from "@/lib/useAppRefresh";


export default function MenuManagement() {
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("All");
  
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  
  const dayOptions = ["All", ...daysOfWeek];
  const { t } = useLanguage();
  
  const mealTypes = ["Breakfast", "Lunch", "Dinner"];
  
  useEffect(() => {
    async function fetchMenu() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Unauthorized — login required");
        
        const data = await offlineFetch("menuData", async () => {
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
        toast.error("Something went wrong. Please try again.");
        setMenuData({});
      } finally {
        setLoading(false);
      }
    }
    
    fetchMenu();
  }, []);
  
  useAppRefresh(fetchMenu);
  
  const handleAddDish = (day, mealType) => {
    setMenuData({
      ...menuData,
      [day]: {
        ...menuData[day],
        [mealType]: [...(menuData[day]?.[mealType] || []), ""],
      },
    });
  };

  const handleRemoveDish = (day, mealType, idx) => {
    const current = [...(menuData[day]?.[mealType] || [])];
    current.splice(idx, 1);
    setMenuData({
      ...menuData,
      [day]: { ...menuData[day], [mealType]: current },
    });
  };

  const handleDishChange = (day, mealType, idx, value) => {
    const updated = [...(menuData[day]?.[mealType] || [])];
    updated[idx] = value;
    setMenuData({
      ...menuData,
      [day]: { ...menuData[day], [mealType]: updated },
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized — login required");

      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/menu/update/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ menuData }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update menu");

      toast.success(data.message || "Menu updated successfully");
    } catch (err) {
      console.error("handleSave error:", err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // if (loading) return <p>Loading menu...</p>;

  const visibleDays =
    selectedDay === "All" ? daysOfWeek : [selectedDay];

 return (
  <div>
    {/* ---------- Day Selector ---------- */}
    <div className={styles.daySelector}>
      <label>{t("selectDay")}</label>

      <DayDropdown
        options={dayOptions}
        value={selectedDay}
        onChange={setSelectedDay}
      />
    </div>

    {visibleDays.map((day) => (
      <div key={day} className={styles.dayCard}>
        <h3 className="font-bold mb-2">{t(day)}</h3>

        {mealTypes.map((mealType) => (
          <div key={mealType} className={styles.mealSection}>
            <label className="font-semibold">{t(mealType)}</label>

            <div className="flex flex-wrap gap-2 mt-1">
              {(menuData[day]?.[mealType] || []).map((item, idx) => (
                <div key={idx} className={styles.inputWrapper}>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={item}
                    onChange={(e) =>
                      handleDishChange(day, mealType, idx, e.target.value)
                    }
                    placeholder={t("dishName")}
                  />

                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() =>
                      handleRemoveDish(day, mealType, idx)
                    }
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                className={styles.addDishBtn}
                onClick={() => handleAddDish(day, mealType)}
              >
                {t("add")}
              </button>
            </div>
          </div>
        ))}

        <button onClick={handleSave} className={styles.saveDayBtn}>
          {t("saveMenu")}
        </button>
      </div>
    ))}
  </div>
);
}
