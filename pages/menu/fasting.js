
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import styles from "../../styles/fasting.module.css";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { offlineFetch } from "../../lib/offlineFetch";
import { useLanguage } from "../../context/LanguageContext";


function FastingRequests() {
  
  // const [fastingRequests, setFastingRequests] = useState([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [groupedRequests, setGroupedRequests] = useState({});
  const [todayCount, setTodayCount] = useState(0);
  const [openDate, setOpenDate] = useState(null);
  const [token, setToken] = useState(null);
  const { t } = useLanguage();
  
  useEffect(() => {
    const tkn = localStorage.getItem("token");
    setToken(tkn);
  }, []);

  const fetchData = async () => {
      try {
        const data = await offlineFetch("fasting-requests", async () => {
          const res = await fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/menu/fasting/fetch/",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (!res.ok) throw new Error("Failed to fetch fasting requests");
          
          return await res.json();
        });

       setGroupedRequests(data.groupedRequests || {});
setTotalRequests(data.totalRequests || 0);
setTodayCount(data.todayCount || 0);
console.log(data);
      } catch (err) {
        console.error("Error fetching fasting requests:", err);
      setGroupedRequests(data.groupedRequests || {});
setTotalRequests(data.totalRequests || 0);
setTodayCount(data.todayCount || 0);
      }
    

  }

  useEffect(() => {
    if (!token) return;

    fetchData();
  }, [token]);

useAppRefresh(fetchData)
  
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>{t("fastingRequests")}</h2>
        <p>{t("fastingSubtitle")}</p>
      </div>

      {/* Summary */}
    <div className={styles.summaryCard}>
  <div>
    {t("totalRequests")}: <strong>{totalRequests}</strong>
  </div>
  <div>
    {t("todayRequests")}: <strong>{todayCount}</strong>
  </div>
</div>

      {/* Requests List */}
      {/* <div className={styles.list}>
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
      </div> */}

      <div className={styles.list}>
  {Object.keys(groupedRequests).length > 0 ? (
    Object.entries(groupedRequests).map(([date, users]) => {
      const isOpen = openDate === date;
      const today = new Date().toISOString().split("T")[0];

      return (
        <div key={date} className={styles.dateGroup}>
          {/* Date Header */}
          <div
            className={styles.dateHeader}
            onClick={() => setOpenDate(isOpen ? null : date)}
          >
            <div>
              <strong>
                {date === today ? `${date} (${t("today")})` : date}
              </strong>
              <span className={styles.countBadge}>
                {users.length}
              </span>
            </div>
            <span>
              {isOpen ? "▲" : "▼"}
            </span>
          </div>

          {/* Collapsible Content */}
          {isOpen && (
            <div className={styles.dateContent}>
              {users.map((user, idx) => (
                <div key={idx} className={styles.requestCard}>
                  <div className={styles.row}>
                    <span className={styles.label}>{t("name")}</span>
                    <span className={styles.value}>{user.name}</span>
                  </div>

                  <div className={styles.row}>
                    <span className={styles.label}>{t("contact")}</span>
                    <span className={styles.value}>
                      {user.phone || t("notAvailable")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })
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
