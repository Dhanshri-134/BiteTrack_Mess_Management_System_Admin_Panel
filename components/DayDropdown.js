import { useState, useRef, useEffect } from "react";
import styles from "../styles/customDropdown.module.css";
import { useLanguage } from "../context/LanguageContext";

export default function DayDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((option) => {
    const optionValue = typeof option === "object" ? option.value : option;
    return optionValue === value;
  });

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((previous) => !previous)}
      >
        {selected
          ? typeof selected === "object"
            ? selected.label
            : t(selected)
          : t("selectDay")}

        <span className={styles.arrow}>{open ? "?" : "?"}</span>
      </button>

      {open ? (
        <div className={styles.menu}>
          {options.map((option) => {
            const optionValue = typeof option === "object" ? option.value : option;
            const label = typeof option === "object" ? option.label : t(option);

            return (
              <div
                key={optionValue}
                className={`${styles.option} ${
                  optionValue === value ? styles.active : ""
                }`}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}