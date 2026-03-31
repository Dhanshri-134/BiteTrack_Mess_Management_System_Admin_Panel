import Layout from "../../components/Layout";
import styles from "../../styles/quickSettings.module.css";
import { useRouter } from "next/router";
import { useLanguage } from "../../context/LanguageContext";
import { useEffect, useRef } from "react";


export default function QuickSettings() {
  const router = useRouter();
  const { t } = useLanguage();
  const cardsRef = useRef([]);


  useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.actionCardVisible);
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.15 }
  );

  cardsRef.current.forEach((el) => el && observer.observe(el));

  return () => observer.disconnect();
}, []);

  const handleAction = (action) => {
    switch (action) {
      case "register":
        router.push("/quickSettings/register"); // navigate to register page
        break;
      case "verify":
        router.push("/quickSettings/verify"); // navigate to verify page
        break;
      case "update":
        router.push("/quickSettings/update-user"); // navigate to users update page
        break;
      case "change-email":
        router.push("/quickSettings/change-email"); // new page
        break;
      default:
        break;
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>{t("quickActions")}</h1>

          <p className={styles.description}>
            {t("quickActionsDescription")}
          </p>

          <div className={styles.actionsGrid}>
            <div
            ref={(el) => (cardsRef.current[0] = el)}
              className={`${styles.actionCard} ${styles.animateIn}`}
              onClick={() => handleAction("register")}
            >
              <h2>{t("register")}</h2>
              <p>{t("registerDescription")}</p>
            </div>

            <div
            ref={(el) => (cardsRef.current[1] = el)}
              className={`${styles.actionCard} ${styles.animateIn}`}
              onClick={() => handleAction("verify")}
            >
              <h2>{t("verify")}</h2>
              <p>{t("verifyDescription")}</p>
            </div>

            <div
            ref={(el) => (cardsRef.current[2] = el)}
              className={`${styles.actionCard} ${styles.animateIn}`}
              onClick={() => handleAction("update")}
            >
              <h2>{t("update")}</h2>
              <p>{t("updateDescription")}</p>
            </div>

            <div 
            ref={(el) => (cardsRef.current[3] = el)}
              className={`${styles.actionCard} ${styles.animateIn}`}
              onClick={() => handleAction("change-email")}
            >
              <h2>{t("changeEmail")}</h2>
              <p>{t("changeEmailDescription")}</p>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
