// import { useEffect, useState } from "react";
// import Layout from "../../components/Layout";
// import styles from "../../styles/menupreview.module.css";

// export default function MenuPreview() {
//   const [menuData, setMenuData] = useState({});
//   const [loading, setLoading] = useState(true);

//   const daysOfWeek = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
//   const mealTypes = ["Breakfast","Lunch","Dinner"];

//   useEffect(() => {
//     async function fetchMenu() {
//       const token = localStorage.getItem("token");

//     if (!token) {
//       alert("Session expired. Please login again.");
//       return (window.location.href = "/login");
//     }

//     try {
//       const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/menu/fetch/", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (res.status === 401) {
//         alert("Session expired. Please login again.");
//         return (window.location.href = "/login");
//       }

//       const data = await res.json();
//       setMenuData(data);

//     } catch (err) {
//         console.error("Error fetching menu:", err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchMenu();
//   }, []);

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <div className={styles.header}>
//           <h1>Weekly Menu</h1>
//           <p>Preview the meals planned for each day of the week.</p>
//         </div>

//         {loading ? (
//           <p className={styles.loading}>Loading menu...</p>
//         ) : (
//           <div className={styles.grid}>
//             {daysOfWeek.map((day) => (
//               <div key={day} className={styles.card}>
//                 <div className={styles.dayHeader}>
//                   <h2>{day}</h2>
//                 </div>
//                 {mealTypes.map((mealType) => (
//                   <div key={mealType} className={`${styles.mealBlock} ${styles[mealType.toLowerCase()]}`}>
//                     <h3>{mealType}</h3>
//                     {menuData[day]?.[mealType]?.length ? (
//                       <ul>
//                         {menuData[day][mealType].map((item, idx) => (
//                           <li key={idx}>{item}</li>
//                         ))}
//                       </ul>
//                     ) : (
//                       <p className={styles.noData}>No items added</p>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </Layout>
//   );
// }


import { useEffect, useState } from "react";
import styles from "../../styles/menupreview.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

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

  if (loading) {
    return <p className={styles.loading}>{t("loadingMenu")}</p>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>{t("weeklyMenu")}</h1>
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
