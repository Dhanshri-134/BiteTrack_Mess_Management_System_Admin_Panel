import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/ratingsreviews.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useAppRefresh } from "@/lib/useAppRefresh";


export default function RatingsReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized — login required");
      
      const data = await offlineFetch("menu-reviews", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/menu/ratings/fetch/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch reviews");
        return await res.json();
      });
      
      setReviews(data || []);
    } catch (err) {
      console.error("fetchData error:", err);
      toast.error(t("somethingWentWrong"));
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{t("ratingsReviews")}</h2>
        <p>{t("ratingsSubtitle")}</p>
      </div>

      {loading ? (
        <p className={styles.loading}>{t("loadingReviews")}</p>
      ) : reviews.length === 0 ? (
        <p className={styles.noData}>{t("noReviewsYet")}</p>
      ) : (
        <div className={styles.grid}>
          {reviews.map((review) => (
            <div key={review.id} className={styles.card}>
              <div className={styles.headerRow}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {review.user_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <h3>{review.user_name}</h3>
                    <p className={styles.email}>{review.user_email}</p>
                  </div>
                </div>
              </div>

              <div className={styles.footer}>
                <span className={styles.type}>
                  {t(review.rating_type) || review.rating_type}
                </span>

                <div className={styles.rating}>
                  {"⭐".repeat(review.rating || 0)}
                </div>

                <span className={styles.date}>
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
