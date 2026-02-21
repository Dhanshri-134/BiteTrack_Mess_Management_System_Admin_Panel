import { useAppRefresh } from "@/lib/useAppRefresh";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/suggestions.module.css";
import { offlineFetch } from "../lib/offlineFetch";
import { useLanguage } from "../context/LanguageContext";

export default function Suggestions() {
  const { t } = useLanguage();

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const data = await offlineFetch("feedback-list", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/feedback/fetch/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("Fetch failed");
        return await res.json();
      });

      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


useAppRefresh(fetchData);

  // if (loading) return <Layout><p>Loading feedback...</p></Layout>;

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>

        <h2 className={styles.title}>{t("suggestionsAndFeedback")}</h2>

        {feedbacks.length === 0 ? (
          <p className={styles.empty}>{t("noFeedbackYet")}</p>
        ) : (
          <div className={styles.feedbackList}>
            {feedbacks.map((fb) => (
              <div key={fb.id} className={styles.feedbackCard}>
                <div className={styles.header}>
                  <span className={styles.name}>{fb.name}</span>
                  <span className={styles.type}>
  {t(
    `feedbackType_${String(fb.feedback_type)
      .toLowerCase()
      .replace(/\s+/g, "_")}`
    ) || fb.feedback_type}
</span>


                </div>

                <p className={styles.message}>{fb.message}</p>

                <div className={styles.footer}>
                  <span className={styles.email}>{fb.email}</span>
                  <span className={styles.date}>
                    {new Date(fb.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
    </main>
      </div>
    </Layout>
  );
}
