
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../../styles/fasting.module.css";

import { offlineFetch } from "../../lib/offlineFetch";
import { useLanguage } from "../../context/LanguageContext";


function FastingRequests() {
  
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
