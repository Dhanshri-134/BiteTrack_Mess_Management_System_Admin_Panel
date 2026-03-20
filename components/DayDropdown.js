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
    {(() => {
      const selected = options.find((opt) => {
        const val = typeof opt === "object" ? opt.value : opt;
        return val === value;
      });

      if (!selected) return t("selectDay");

      return typeof selected === "object"
        ? selected.label
        : t(selected);
    })()}

    <span className={styles.arrow}>{open ? "▲" : "▼"}</span>
  </button>

  {open && (
    <div className={styles.menu}>
      {options.map((opt) => {
        const val = typeof opt === "object" ? opt.value : opt;
        const label =
          typeof opt === "object" ? opt.label : t(opt);

        return (
          <div
            key={val}
            className={`${styles.option} ${
              val === value ? styles.active : ""
            }`}
            onClick={() => {
              onChange(val);
              setOpen(false);
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  )}
</div>
  );
}
