import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import styles from "../styles/customDropdown.module.css";
import { useLanguage } from "../context/LanguageContext";
import { formatDisplayDate } from "../lib/dateFormat";

function parseDateValue(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export default function DateField({
  value = "",
  onChange,
  name,
  id,
  wrapperClassName = "",
  placeholder,
}) {
  const { t } = useLanguage();
  const ref = useRef(null);
  const today = new Date();
  const parsed = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(parsed?.year || today.getFullYear());
  const [month, setMonth] = useState(parsed?.month || today.getMonth() + 1);
  const [day, setDay] = useState(parsed?.day || today.getDate());

  useEffect(() => {
    const next = parseDateValue(value);
    if (next) {
      setYear(next.year);
      setMonth(next.month);
      setDay(next.day);
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

  const daysInMonth = new Date(year, month, 0).getDate();

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: new Date(2000, index, 1).toLocaleString("default", { month: "short" }),
      })),
    []
  );

  const currentYear = today.getFullYear();
  const yearOptions = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const optionYear = currentYear - 3 + index;
        return { value: optionYear, label: String(optionYear) };
      }),
    [currentYear]
  );

  const dayOptions = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, index) => ({
        value: index + 1,
        label: String(index + 1),
      })),
    [daysInMonth]
  );

  function emitChange(nextYear, nextMonth, nextDay) {
    if (typeof onChange !== "function") return;
    const nextValue = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
    onChange({
      target: {
        name,
        id,
        value: nextValue,
      },
    });
  }

  const displayValue = value ? formatDisplayDate(value) : placeholder || t("selectDate");

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
          <CalendarDays size={18} />
          <span className={styles.fieldPreviewText}>
            <span className={styles.fieldPreviewLabel}>{placeholder || t("selectDate")}</span>
            <span>{displayValue}</span>
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
              <strong>{t("selectDate")}</strong>
              <p className={styles.fieldPanelSubtext}>{displayValue}</p>
            </div>
          </div>
          <div className={styles.fieldSelectorGrid}>
            <div className={styles.fieldColumn}>
              <span className={styles.fieldColumnTitle}>{t("date")}</span>
              <div className={styles.fieldOptionList}>
                {dayOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.fieldOptionButton} ${day === option.value ? styles.fieldOptionActive : ""}`}
                    onClick={() => {
                      setDay(option.value);
                      emitChange(year, month, option.value);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.fieldColumn}>
              <span className={styles.fieldColumnTitle}>{t("month")}</span>
              <div className={styles.fieldOptionList}>
                {monthOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.fieldOptionButton} ${month === option.value ? styles.fieldOptionActive : ""}`}
                    onClick={() => {
                      const safeDay = Math.min(day, new Date(year, option.value, 0).getDate());
                      setMonth(option.value);
                      setDay(safeDay);
                      emitChange(year, option.value, safeDay);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.fieldColumn}>
              <span className={styles.fieldColumnTitle}>{t("year")}</span>
              <div className={styles.fieldOptionList}>
                {yearOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.fieldOptionButton} ${year === option.value ? styles.fieldOptionActive : ""}`}
                    onClick={() => {
                      const safeDay = Math.min(day, new Date(option.value, month, 0).getDate());
                      setYear(option.value);
                      setDay(safeDay);
                      emitChange(option.value, month, safeDay);
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
                const now = new Date();
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
                setDay(now.getDate());
                emitChange(now.getFullYear(), now.getMonth() + 1, now.getDate());
                setOpen(false);
              }}
            >
              {t("today")}
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
