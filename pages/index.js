import Link from "next/link";
import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import styles from "../styles/splash.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function Splash() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      router.replace("/dashboard");
    }
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image
            src="/Assets/logo_Bite_Track.png"
            alt={t("biteTrackLogoAlt")}
            width={100}
            height={100}
            className={styles.logoImage}
            priority
          />
        </div>
        <h1 className={styles.logo}></h1>
      </header>

      <main className={styles.main}>
        <h2 className={styles.title}>{t("smartMessManagement")}</h2>
        <p className={styles.subtitle}>
          {t("splashSubtitle")}
        </p>

        {/* <Link href="/login" className={styles.ctaBtn}>
          Get Started
        </Link> */}
        {/* <Link href="/login/" legacyBehavior>
          <a className={styles.ctaBtn}>{t("getStarted")}</a>
        </Link> */}
        <button
          className={styles.ctaBtn}
          onClick={() => router.push("/login")}
        >
          {t("getStarted")}
        </button>
      </main>

      <footer className={styles.footer}>
        <p>
          © {new Date().getFullYear()} {t("biteTrack")} · {t("allRightsReserved")} 
          <br></br>
          · {t("poweredBy")}
        </p>
      </footer>
    </div>
  );
}
