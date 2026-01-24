import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function RegisterSuccess() {
  const router = useRouter();
  const { t, lang, toggleLanguage } = useLanguage();

  return (
    <div className={styles.container}>
      {/* Logo */}
      <img
        src="/Assets/logo_Bite_Track.png"
        alt={t("biteTrackLogoAlt")}
        className={styles.logo}
      />

      {/* Language Toggle */}
      <div className="toggleLang">
        <button onClick={toggleLanguage} className={styles.toggleBtn}>
          {lang === "en" ? "मराठी ?" : "English ?"}
        </button>
      </div>

      <div className={styles.card}>
        <h1 className={styles.Header}>🍽️ {t("biteTrack")}</h1>

        <div className={`${styles.form} ${styles.fade}`}>
          <h2 className={styles.title}>
            {t("registrationSubmitted")}
          </h2>

          <p className={styles.subtitle} style={{ textAlign: "center" }}>
            {t("registrationWaitingApproval")}
          </p>

          <div
            style={{
              marginTop: "1.2rem",
              padding: "12px",
              background: "#f0fdfa",
              borderRadius: "12px",
              color: "#065f5b",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            ⏳ {t("approvalInfo")}
          </div>

          <button
            className={styles.loginBtn}
            style={{ marginTop: "1.5rem" }}
            onClick={() => router.push("/login")}
          >
            {t("goToLogin")}
          </button>
        </div>
      </div>
    </div>
  );
}
