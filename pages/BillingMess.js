import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/billingMess.module.css";
import { useRouter } from "next/router";
import { useLanguage } from "../context/LanguageContext";
import toast from "react-hot-toast";
import { formatDisplayDate } from "../lib/dateFormat";
import { offlineFetch } from "../lib/offlineFetch";

export default function Billing() {
  const router = useRouter();
  const { t } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    offlineFetch("billing-status", async () => {
      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/billing/status/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  const startSubscription = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      "https://bite-track-mess-management-system-a.vercel.app/api/billing/create-subscription/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || t("somethingWentWrong"));
      return;
    }

    window.location.href = `https://checkout.razorpay.com/v1/subscription/${data.subscription_id}`;
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h2>{t("billing_subscription")}</h2>

        {loading && <p>{t("loading_billing_details")}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {data && (
          <>
            <div className={styles.card}>
              <p>
                <strong>{t("status")}:</strong>{" "}
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
                  <strong>{t("trial_ends_on")}:</strong>{" "}
                  {formatDisplayDate(data.trial_end_date)}
                </p>
              )}

              {data.days_remaining !== null && (
                <p>
                  <strong>{t("days_remaining")}:</strong>{" "}
                  {data.days_remaining}
                </p>
              )}
            </div>

            {data.subscription_status === "expired" && (
              <div className={styles.warning}>
                <p>{t("trial_expired")}</p>
                <p>{t("contact_support_to_continue")}</p>
              </div>
            )}

            {/* 
            <button onClick={startSubscription}>
              {t("add_payment_method")}
            </button> 
            */}
          </>
        )}
      </div>
    </Layout>
  );
}
