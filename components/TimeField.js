import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Clock3 } from "lucide-react";
import styles from "../styles/customDropdown.module.css";
import { useLanguage } from "../context/LanguageContext";

function parseTimeValue(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
}

export default function TimeField({
  value = "",
  onChange,
  name,
  id,
  wrapperClassName = "",
  placeholder,
}) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const now = new Date();
  const parsed = parseTimeValue(value);
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(parsed?.hours ?? now.getHours());
  const [minutes, setMinutes] = useState(parsed?.minutes ?? now.getMinutes());

  useEffect(() => {
    const next = parseTimeValue(value);
    if (next) {
      setHours(next.hours);
      setMinutes(next.minutes);
    }
  }, [value]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const hourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        value: index,
        label: String(index).padStart(2, "0"),
      })),
    []
  );

  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, index) => ({
        value: index,
        label: String(index).padStart(2, "0"),
      })),
    []
  );

  function emitChange(nextHours, nextMinutes) {
    if (typeof onChange !== "function") return;
    const nextValue = `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
    onChange({
      target: {
        name,
        id,
        value: nextValue,
      },
    });
  }

  const displayValue = value || placeholder || t("selectTime");

  return (
    <div className={`${styles.inputFieldShell} ${wrapperClassName}`.trim()} ref={ref}>
      <input type="hidden" name={name} id={id} value={value} readOnly />
      {open ? <div className={styles.fieldBackdrop} onClick={() => setOpen(false)} /> : null}
      <button
        type="button"
        className={`${styles.trigger} ${styles.fieldTrigger}`}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className={styles.fieldTriggerLabel}>
          <Clock3 size={18} />
          <span className={styles.fieldPreviewText}>
            <span className={styles.fieldPreviewLabel}>{placeholder || t("selectTime")}</span>
            <span className={styles.timeValueGroup}>
              <span className={styles.timeValueBox}>{String(hours).padStart(2, "0")}</span>
              <span className={styles.timeSeparator}>:</span>
              <span className={styles.timeValueBox}>{String(minutes).padStart(2, "0")}</span>
            </span>
          </span>
        </span>
        <span className={styles.arrow}>
          <ChevronDown size={18} className={open ? styles.arrowOpenIcon : ""} />
        </span>
      </button>

      {open ? (
        <div className={styles.fieldPanel}>
          <div className={styles.fieldPanelHeader}>
            <div>
              <strong>{t("selectTime")}</strong>
              <p className={styles.fieldPanelSubtext}>{displayValue}</p>
            </div>
          </div>
          <div className={styles.fieldSelectorGrid}>
            <div className={styles.fieldColumn}>
              <span className={styles.fieldColumnTitle}>{t("hours")}</span>
              <div className={styles.fieldOptionList}>
                {hourOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.fieldOptionButton} ${hours === option.value ? styles.fieldOptionActive : ""}`}
                    onClick={() => {
                      setHours(option.value);
                      emitChange(option.value, minutes);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.fieldColumn}>
              <span className={styles.fieldColumnTitle}>{t("minutes")}</span>
              <div className={styles.fieldOptionList}>
                {minuteOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.fieldOptionButton} ${minutes === option.value ? styles.fieldOptionActive : ""}`}
                    onClick={() => {
                      setMinutes(option.value);
                      emitChange(hours, option.value);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.fieldActionRow}>
            <button
              type="button"
              className={styles.actionTextBtn}
              onClick={() => {
                const current = new Date();
                setHours(current.getHours());
                setMinutes(current.getMinutes());
                emitChange(current.getHours(), current.getMinutes());
                setOpen(false);
              }}
            >
              {t("now")}
            </button>
            <button type="button" className={styles.actionTextBtn} onClick={() => setOpen(false)}>
              {t("done")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
