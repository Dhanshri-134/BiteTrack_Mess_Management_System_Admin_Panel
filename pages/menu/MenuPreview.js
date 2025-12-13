import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/menupreview.module.css";

export default function MenuPreview() {
  const [menuData, setMenuData] = useState({});
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const mealTypes = ["Breakfast","Lunch","Dinner"];

  useEffect(() => {
    async function fetchMenu() {
      const token = localStorage.getItem("token");

    if (!token) {
      alert("Session expired. Please login again.");
      return (window.location.href = "/login");
    }

    try {
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

    } catch (err) {
        console.error("Error fetching menu:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Weekly Menu</h1>
          <p>Preview the meals planned for each day of the week.</p>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading menu...</p>
        ) : (
          <div className={styles.grid}>
            {daysOfWeek.map((day) => (
              <div key={day} className={styles.card}>
                <div className={styles.dayHeader}>
                  <h2>{day}</h2>
                </div>
                {mealTypes.map((mealType) => (
                  <div key={mealType} className={`${styles.mealBlock} ${styles[mealType.toLowerCase()]}`}>
                    <h3>{mealType}</h3>
                    {menuData[day]?.[mealType]?.length ? (
                      <ul>
                        {menuData[day][mealType].map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.noData}>No items added</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
