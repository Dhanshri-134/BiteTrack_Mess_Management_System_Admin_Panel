import { useState, useEffect } from "react";
import styles from "../../styles/menu.module.css";

export default function MenuManagement() {
  const [menuData, setMenuData] = useState({});
  const [messId, setMessId] = useState(1); 
  const daysOfWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const mealTypes = ["Breakfast", "Lunch", "Dinner"];

  useEffect(() => {
    async function fetchMenu() {
      const token = localStorage.getItem("token");
      if (!token) {
      alert("Login expired. Please login again.");
      return (window.location.href = "/login");
    }

    const res = await fetch("/api/menu/fetch", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      return (window.location.href = "/login");
    }

    const data = await res.json();
    setMenuData(data);
  }

    fetchMenu();
  }, []);

  const handleAddDish = (day, mealType) => {
    setMenuData({
      ...menuData,
      [day]: { ...menuData[day], [mealType]: [...menuData[day][mealType], ""] },
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
    const updated = [...menuData[day][mealType]];
    updated[idx] = value;
    setMenuData({
      ...menuData,
      [day]: { ...menuData[day], [mealType]: updated },
    });
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
     if (!token) {
    alert("Login expired. Please login again.");
    return (window.location.href = "/login");
  }
    const res = await fetch("/api/menu/update", {
      method: "POST",
      headers: { "Content-Type": "application/json",Authorization: `Bearer ${token}` },
      body: JSON.stringify({ menuData }),
    });
    const data = await res.json();
    alert(data.message || "Menu updated successfully");
  };  ``

  return (
    <div>
      {daysOfWeek.map((day) => (
        <div key={day} className={styles.dayCard}>
          <h3 className="font-bold mb-2">{day}</h3>
          {mealTypes.map((mealType) => (
            <div key={mealType} className={styles.mealSection}>
              <label className="font-semibold">{mealType}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(menuData[day]?.[mealType] || []).map((item, idx) => (
                  <div key={idx} className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={item}
                      onChange={(e) => handleDishChange(day, mealType, idx, e.target.value)}
                      placeholder="Dish name"
                      aria-label={`Dish ${idx + 1} for ${mealType} on ${day}`}
                    />
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => handleRemoveDish(day, mealType, idx)}
                      aria-label="Remove dish"
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
                  Add
                </button>
              </div>
              
            </div>
            
          ))}
          {/* Special Dish Section (to be added later) */}
                <button
        onClick={handleSave}
        className={styles.saveDayBtn}
      >
        Save Menu
      </button>
        </div>
      ))}
      {/* <button
        onClick={handleSave}
        className={styles.saveMenuBtn}
      >
        Save Menu
      </button> */}
    </div>
  );
}
