// import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
// import Layout from "../../components/Layout";
// import styles from "../../styles/fasting.module.css";
// import useAuth from "../../hooks/useAuth";

// function FastingRequests() {
//   useAuth(); 
//   const [fastingRequests, setFastingRequests] = useState([]);
//   const [totalRequests, setTotalRequests] = useState(0);

//   const [token, setToken] = useState(null);

//   useEffect(() => {
//     const t = localStorage.getItem("token");
//     setToken(t);
//   }, []);

//   const fetchData = async () => {
//     if (!token) return;

//     try {
//       const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/menu/fasting/fetch/`, {
//         method: "GET",
//         headers: {
//           "Authorization": `Bearer ${token}`,
//         },
//       });

//       if (!res.ok) throw new Error("Failed to fetch fasting requests");

//       const data = await res.json();

//       setFastingRequests(data.fastingRequests || []);
//       setTotalRequests(data.totalRequests || 0);
//     } catch (err) {
//       console.error("Error fetching fasting requests:", err);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, [token]);

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <h2 className="font-bold text-lg mb-4">Fasting Requests Summary</h2>

//         <div className={styles.summarySection}>
//           <div className={`${styles.card} ${styles.approved}`}>
//             Total Fasting Requests: <b>{totalRequests}</b>
//           </div>
//         </div>

//         <table className={styles.table}>
//           <thead>
//             <tr>
//               <th>Name</th>
//               <th>Contact No</th>
//               <th>Fasting Date</th>
//             </tr>
//           </thead>
//           <tbody>
//             {fastingRequests.length > 0 ? (
//               fastingRequests.map((req, idx) => (
//                 <tr key={idx}>
//                   <td>{req.name || "Unknown"}</td>
//                   <td>{req.phone || "N/A"}</td>
//                   <td>{req.fasting_date}</td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan="3">No fasting requests found.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </Layout>
//   );
// }

// export default dynamic(() => Promise.resolve(FastingRequests), {
//   ssr: false,
// });

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../../styles/fasting.module.css";
import useAuth from "../../hooks/useAuth";
import { offlineFetch } from "../../lib/offlineFetch";
import { useLanguage } from "../../context/LanguageContext";

function FastingRequests() {
  useAuth();

  const [fastingRequests, setFastingRequests] = useState([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [token, setToken] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    const tkn = localStorage.getItem("token");
    setToken(tkn);
  }, []);

  useEffect(() => {
    if (!token) return;

    async function fetchData() {
      try {
        const data = await offlineFetch("fasting-requests", async () => {
          const res = await fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/menu/fasting/fetch/",
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!res.ok) throw new Error("Failed to fetch fasting requests");

          return await res.json();
        });

        setFastingRequests(data.fastingRequests || []);
        setTotalRequests(data.totalRequests || 0);
      } catch (err) {
        console.error("Error fetching fasting requests:", err);
        setFastingRequests([]);
        setTotalRequests(0);
      }
    }

    fetchData();
  }, [token]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>{t("fastingRequests")}</h2>
        <p>{t("fastingSubtitle")}</p>
      </div>

      {/* Summary */}
      <div className={styles.summaryCard}>
        {t("totalRequests")}:{" "}
        <strong>{totalRequests}</strong>
      </div>

      {/* Requests List */}
      <div className={styles.list}>
        {fastingRequests.length > 0 ? (
          fastingRequests.map((req, idx) => (
            <div key={idx} className={styles.requestCard}>
              <div className={styles.row}>
                <span className={styles.label}>
                  {t("name")}
                </span>
                <span className={styles.value}>
                  {req.name || t("unknown")}
                </span>
              </div>

              <div className={styles.row}>
                <span className={styles.label}>
                  {t("contact")}
                </span>
                <span className={styles.value}>
                  {req.phone || t("notAvailable")}
                </span>
              </div>

              <div className={styles.row}>
                <span className={styles.label}>
                  {t("fastingDate")}
                </span>
                <span className={styles.value}>
                  {req.fasting_date}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            {t("noFastingRequests")}
          </div>
        )}
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(FastingRequests), {
  ssr: false,
});
