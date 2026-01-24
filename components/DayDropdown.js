import { useState, useRef, useEffect } from "react";
import styles from "../styles/customDropdown.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function DayDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { t } = useLanguage();

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(!open)}
      >
        {value ? t(value) : t("selectDay")}
        <span className={styles.arrow}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={styles.menu}>
          {options.map((opt) => (
            <div
              key={opt}
              className={`${styles.option} ${
                opt === value ? styles.active : ""
              }`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {t(opt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
