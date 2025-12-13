import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/suggestions.module.css";

export default function Suggestions() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
useEffect(() => {
  async function fetchFeedback() {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Session expired. Please login again.");
      return;
    }

    const res = await fetch("/api/feedback/fetch", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    setFeedbacks(data);
    setLoading(false);
  }

  fetchFeedback();
}, []);


  if (loading) return <Layout><p>Loading feedback...</p></Layout>;

  return (
    <Layout>
      <div className={styles.container}>
        <h2 className={styles.title}>Student Suggestions & Feedback</h2>
        {feedbacks.length === 0 ? (
          <p className={styles.empty}>No feedback submitted yet.</p>
        ) : (
          <div className={styles.feedbackList}>
            {feedbacks.map((fb) => (
              <div key={fb.id} className={styles.feedbackCard}>
                <div className={styles.header}>
                  <span className={styles.name}>{fb.name}</span>
                  <span className={styles.type}>{fb.feedback_type}</span>
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
      </div>
    </Layout>
  );
}
