import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/ratingsreviews.module.css";

export default function RatingsReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  async function fetchReviews() {
    try {
      const token = localStorage.getItem("token"); // or wherever you store JWT
      const res = await fetch("/api/menu/ratings/fetch", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      const data = await res.json();
      setReviews(data || []);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  }
  fetchReviews();
}, []);


  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Ratings & Reviews</h1>
          <p>See what members think about the mess experience.</p>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className={styles.noData}>No reviews yet.</p>
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
                  <div className={styles.rating}>
                    {"⭐".repeat(review.rating || 0)}
                  </div>
                </div>

                {/* <p className={styles.comment}>
                  {review.comment || "No comment provided."}
                </p> */}

                <div className={styles.footer}>
                  <span className={styles.type}>{review.rating_type}</span>
                  <span className={styles.date}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
