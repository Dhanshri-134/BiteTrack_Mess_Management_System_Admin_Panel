import { useEffect, useState } from "react";
import Layout from "../components/Layout"; // ✅ your existing layout
import styles from "../styles/billingMess.module.css"; // optional, if exists
import { useRouter } from "next/router";

export default function Billing() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("https://bite-track-mess-management-system-a.vercel.app/api/billing/status/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
const startSubscription = async () => {
  const token = localStorage.getItem("token");

  const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/billing/create-subscription/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    alert(data.error);
    return;
  }

  window.location.href = `https://checkout.razorpay.com/v1/subscription/${data.subscription_id}`;
};

  return (
    <Layout>
      <div className={styles.container}>
        <h2>Billing & Subscription</h2>

        {loading && <p>Loading billing details...</p>}
        {error && <p className={styles.error}>{error}</p>}

        {data && (
          <>
            <div className={styles.card}>
              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={
                    data.subscription_status === "expired"
                      ? styles.expired
                      : styles.active
                  }
                >
                  {data.subscription_status.toUpperCase()}
                </span>
              </p>

              {data.trial_end_date && (
                <p>
                  <strong>Trial ends on:</strong>{" "}
                  {new Date(data.trial_end_date).toDateString()}
                </p>
              )}

              {data.days_remaining !== null && (
                <p>
                  <strong>Days remaining:</strong> {data.days_remaining}
                </p>
              )}
            </div>

            {data.subscription_status === "expired" && (
              <div className={styles.warning}>
                <p>Your trial has expired.</p>
                <p>Please add a payment method to continue using the app.</p>
              </div>
            )}

            <button onClick={startSubscription}>
  Add Payment Method
</button>

          </>
        )}
      </div>
    </Layout>
  );
}
