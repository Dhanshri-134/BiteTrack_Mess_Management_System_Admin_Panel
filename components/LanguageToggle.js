import { useLanguage } from "../context/LanguageContext";
import styles from "../styles/navbar.module.css"

export default function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button onClick={toggleLanguage} className={styles.toggleBtn}>
      {lang === "en" ? "म" : "En"}
    </button>
  );
}
