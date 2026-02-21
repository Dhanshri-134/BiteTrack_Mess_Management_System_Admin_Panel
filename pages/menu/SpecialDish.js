import { useEffect, useState } from "react";
import styles from "../../styles/specialdish.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { supabase } from "../../lib/supabase";

import { useAppRefresh } from "@/lib/useAppRefresh";

export default function SpecialDish() {
  const [specials, setSpecials] = useState([]);
  const [newDish, setNewDish] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cravings, setCravings] = useState([]);
  const [dishImage, setDishImage] = useState(null);

  const { t } = useLanguage();

  useEffect(() => {
    fetchSpecials();
    fetchCravings();
  }, []);

  
  const fetchSpecials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized — please login");

      const data = await offlineFetch("special-dishes", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/menu/special_dishes/fetch/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch specials");
        return res.json();
      });

      setSpecials(data || []);
    } catch (err) {
      console.error("fetchSpecials error:", err);
      setSpecials([]);
    } finally {
      setLoading(false);
    }
  };

  

  const fetchCravings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized — please login");

      const data = await offlineFetch("cravings", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/menu/cravings/fetch/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch cravings");
        return res.json();
      });
      
      setCravings(normalizeCravings(data || []));
    } catch (err) {
      console.error("fetchCravings error:", err);
      setCravings([]);
    } finally {
      setLoading(false);
    }
  };

  function normalizeCravings(data) {
    const simplified = data.map((c) => ({
      ...c,
      text: c.craving_text
      .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, ""),
    }));

    
    const groups = {};
    for (const item of simplified) {
      const key = Object.keys(groups).find(
        (existing) => similarity(existing, item.text) > 0.8
      );
      if (key) groups[key].push(item);
      else groups[item.text] = [item];
    }
    
    return Object.entries(groups).map(([text, list]) => ({
      craving: text,
      count: list.length,
    }));
  }

  function similarity(a, b) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1.0;
    return (
      (longer.length - editDistance(longer, shorter)) /
      parseFloat(longer.length)
    );
  }

  function editDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] =
          b[i - 1] === a[j - 1]
            ? matrix[i - 1][j - 1]
            : Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
      }
    }
    return matrix[b.length][a.length];
  }

  const uploadDishImage = async (file) => {
  const fileName = `special_dishes/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("dish-images")
    .upload(fileName, file, { upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("dish-images")
    .getPublicUrl(fileName);

    return data.publicUrl;
  };

  
 const addDish = async () => {
  if (!newDish.trim()) return;

  try {
    const token = localStorage.getItem("token");
    let imageUrl = null;
    
    if (dishImage) {
      imageUrl = await uploadDishImage(dishImage);
    }

    const res = await fetch(
      "https://bite-track-mess-management-system-a.vercel.app/api/menu/special_dishes/add/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dish_name: newDish,
          is_veg: isVeg,
          image_url: imageUrl,
        }),
      }
    );

    if (!res.ok) throw new Error("Failed");

    setNewDish("");
    setDishImage(null);
    fetchSpecials();
  } catch (err) {
    console.error("Error adding dish:", err);
    toast.error(t("somethingWentWrong"));
  }
};


const deleteDish = async (id) => {
  if (!confirm(t("confirmDeleteDish"))) return;
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error(t("sessionExpired"));
      return (window.location.href = "/login");
    }

    try {
      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/menu/special_dishes/delete/",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id }),
        }
      );
      
      if (res.status === 401) {
        toast.error(t("sessionExpired"));
        return (window.location.href = "/login");
      }
      
      if (res.ok) {
        setSpecials((prev) => prev.filter((dish) => dish.id !== id));
      }
    } catch (err) {
      console.error("Error deleting dish:", err);
    }
  };
  
  useAppRefresh(fetchSpecials);
  useAppRefresh(fetchCravings);
  
  
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>{t("sundaySpecialDishes")}</h2>
      <p className={styles.subtext}>{t("sundaySpecialSubtitle")}</p>

      <div className={styles.addSection}>
        <input
          type="text"
          value={newDish}
          onChange={(e) => setNewDish(e.target.value)}
          placeholder={t("enterDishName")}
          className={styles.input}
        />
        </div>
      <div className={styles.addSection}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setDishImage(e.target.files[0])}
          className={styles.fileInput}
          />

          </div>
      <div className={styles.addSection}>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={isVeg}
            onChange={(e) => setIsVeg(e.target.checked)}
          />
          {t("veg")}
        </label>

        <button onClick={addDish} className={styles.addBtn}>
          {t("addDish")}
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>{t("loadingDishes")}</p>
      ) : specials.length === 0 ? (
        <p className={styles.noData}>{t("noSpecialDishes")}</p>
      ) : (
        <div className={styles.grid}>
          {specials.map((dish) => (
            <div
              key={dish.id}
              className={`${styles.card} ${
                dish.is_veg ? styles.veg : styles.nonVeg
              }`}
            >
              <div className={styles.cardContent}>
                <div>
                  {dish.image_url && (
  <img
    src={dish.image_url}
    alt={dish.dish_name}
    className={styles.dishImage}
  />
)}

                  <h3 className={styles.dishName}>{dish.dish_name}</h3>
                  <p className={styles.voteCount}>
                    ⭐ {dish.votes ?? 0} {t("votes")}
                  </p>
                </div>

                <div className={styles.tagBlock}>
                  <span
                    className={`${styles.tag} ${
                      dish.is_veg ? styles.veg : styles.nonVeg
                    }`}
                  >
                    {dish.is_veg ? t("veg") : t("nonVeg")}
                  </span>

                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteDish(dish.id)}
                    title={t("deleteDish")}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.cravingsSection}>
        <h3>{t("userCravings")}</h3>

        {cravings.length ? (
          <ul className={styles.cravingsList}>
            {cravings.map((c, i) => (
              <li key={i}>
                <strong>{c.craving}</strong> — {c.count}{" "}
                {t("requests")}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("noCravingsYet")}</p>
        )}
      </div>
    </div>
  );
}




// import { useEffect, useState } from "react";
// import styles from "../../styles/specialdish.module.css";
// import { offlineFetch } from "../../lib/offlineFetch";
// import toast from "react-hot-toast";
// import { useLanguage } from "../../context/LanguageContext";

// export default function SpecialDish() {
//   const [specials, setSpecials] = useState([]);
//   const [newDish, setNewDish] = useState("");
//   const [isVeg, setIsVeg] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [cravings, setCravings] = useState([]);
//   const { t } = useLanguage();

//   useEffect(() => {
//     fetchSpecials();
//     fetchCravings();
//   }, []);

//   const fetchSpecials = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Unauthorized — please login");

//       const data = await offlineFetch("special-dishes", async () => {
//         const res = await fetch(
//           "https://bite-track-mess-management-system-a.vercel.app/api/menu/special_dishes/fetch/",
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (!res.ok) throw new Error("Failed to fetch specials");
//         return res.json();
//       });

//       setSpecials(data || []);
//     } catch (err) {
//       console.error("fetchSpecials error:", err);
//       setSpecials([]);
//     } finally {
//       setLoading(false);
//     }
//   };

  

//   const fetchCravings = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Unauthorized — please login");

//       const data = await offlineFetch("cravings", async () => {
//         const res = await fetch(
//           "https://bite-track-mess-management-system-a.vercel.app/api/menu/cravings/fetch/",
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (!res.ok) throw new Error("Failed to fetch cravings");
//         return res.json();
//       });

//       setCravings(normalizeCravings(data || []));
//     } catch (err) {
//       console.error("fetchCravings error:", err);
//       setCravings([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   function normalizeCravings(data) {
//     const simplified = data.map((c) => ({
//       ...c,
//       text: c.craving_text
//         .toLowerCase()
//         .trim()
//         .replace(/[^a-z0-9\s]/g, ""),
//     }));


//     const groups = {};
//     for (const item of simplified) {
//       const key = Object.keys(groups).find(
//         (existing) => similarity(existing, item.text) > 0.8
//       );
//       if (key) groups[key].push(item);
//       else groups[item.text] = [item];
//     }

//     return Object.entries(groups).map(([text, list]) => ({
//       craving: text,
//       count: list.length,
//     }));
//   }

//   function similarity(a, b) {
//     const longer = a.length > b.length ? a : b;
//     const shorter = a.length > b.length ? b : a;
//     if (longer.length === 0) return 1.0;
//     return (
//       (longer.length - editDistance(longer, shorter)) /
//       parseFloat(longer.length)
//     );
//   }

//   function editDistance(a, b) {
//     const matrix = [];
//     for (let i = 0; i <= b.length; i++) matrix[i] = [i];
//     for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

//     for (let i = 1; i <= b.length; i++) {
//       for (let j = 1; j <= a.length; j++) {
//         matrix[i][j] =
//           b[i - 1] === a[j - 1]
//             ? matrix[i - 1][j - 1]
//             : Math.min(
//                 matrix[i - 1][j - 1] + 1,
//                 matrix[i][j - 1] + 1,
//                 matrix[i - 1][j] + 1
//               );
//       }
//     }
//     return matrix[b.length][a.length];
//   }

//   const addDish = async () => {
//     if (!newDish.trim()) return;
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch(
//         "https://bite-track-mess-management-system-a.vercel.app/api/menu/special_dishes/add/",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({ dish_name: newDish, is_veg: isVeg }),
//         }
//       );

//       if (res.ok) {
//         setNewDish("");
//         fetchSpecials();
//       }

//       if (res.status === 401) {
//         toast.error(t("sessionExpired"));
//         window.location.href = "/login";
//       }
//     } catch (err) {
//       console.error("Error adding dish:", err);
//     }
//   };

//   const deleteDish = async (id) => {
//     if (!confirm(t("confirmDeleteDish"))) return;
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error(t("sessionExpired"));
//       return (window.location.href = "/login");
//     }

//     try {
//       const res = await fetch(
//         "https://bite-track-mess-management-system-a.vercel.app/api/menu/special_dishes/delete/",
//         {
//           method: "DELETE",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({ id }),
//         }
//       );

//       if (res.status === 401) {
//         toast.error(t("sessionExpired"));
//         return (window.location.href = "/login");
//       }

//       if (res.ok) {
//         setSpecials((prev) => prev.filter((dish) => dish.id !== id));
//       }
//     } catch (err) {
//       console.error("Error deleting dish:", err);
//     }
//   };

//   return (
//     <div className={styles.container}>
//       <h2 className={styles.heading}>{t("sundaySpecialDishes")}</h2>
//       <p className={styles.subtext}>{t("sundaySpecialSubtitle")}</p>

//       <div className={styles.addSection}>
//         <input
//           type="text"
//           value={newDish}
//           onChange={(e) => setNewDish(e.target.value)}
//           placeholder={t("enterDishName")}
//           className={styles.input}
//         />

//         <label className={styles.checkbox}>
//           <input
//             type="checkbox"
//             checked={isVeg}
//             onChange={(e) => setIsVeg(e.target.checked)}
//           />
//           {t("veg")}
//         </label>

//         <button onClick={addDish} className={styles.addBtn}>
//           {t("addDish")}
//         </button>
//       </div>

//       {loading ? (
//         <p className={styles.loading}>{t("loadingDishes")}</p>
//       ) : specials.length === 0 ? (
//         <p className={styles.noData}>{t("noSpecialDishes")}</p>
//       ) : (
//         <div className={styles.grid}>
//           {specials.map((dish) => (
//             <div
//               key={dish.id}
//               className={`${styles.card} ${
//                 dish.is_veg ? styles.veg : styles.nonVeg
//               }`}
//             >
//               <div className={styles.cardContent}>
//                 <div>
//                   <h3 className={styles.dishName}>{dish.dish_name}</h3>
//                   <p className={styles.voteCount}>
//                     ⭐ {dish.votes ?? 0} {t("votes")}
//                   </p>
//                 </div>

//                 <div className={styles.tagBlock}>
//                   <span
//                     className={`${styles.tag} ${
//                       dish.is_veg ? styles.veg : styles.nonVeg
//                     }`}
//                   >
//                     {dish.is_veg ? t("veg") : t("nonVeg")}
//                   </span>

//                   <button
//                     className={styles.deleteBtn}
//                     onClick={() => deleteDish(dish.id)}
//                     title={t("deleteDish")}
//                   >
//                     🗑
//                   </button>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       <div className={styles.cravingsSection}>
//         <h3>{t("userCravings")}</h3>

//         {cravings.length ? (
//           <ul className={styles.cravingsList}>
//             {cravings.map((c, i) => (
//               <li key={i}>
//                 <strong>{c.craving}</strong> — {c.count}{" "}
//                 {t("requests")}
//               </li>
//             ))}
//           </ul>
//         ) : (
//           <p>{t("noCravingsYet")}</p>
//         )}
//       </div>
//     </div>
//   );
// }
