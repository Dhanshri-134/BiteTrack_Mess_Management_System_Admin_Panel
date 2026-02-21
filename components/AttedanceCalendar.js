import React, { useState, useMemo,useEffect } from "react";
import styles from "../styles/AttendanceCalendar.module.css";
import { useLanguage } from "../context/LanguageContext";
import { ArrowLeft, ArrowRight } from "lucide-react"

export default function AttendanceCalendar({ attendanceMap,  ownerMarkedDates = [], year,  month }) {
  const safeAttendanceMap = attendanceMap ?? {};
  const today = new Date();
  const { t } = useLanguage();

  // Default to current month/year
  const [currentYear, setCurrentYear] = useState( year ? Number(year) : today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(  month ? Number(month) : today.getMonth() + 1);

   useEffect(() => {
    if (year) setCurrentYear(Number(year));
    if (month) setCurrentMonth(Number(month));
  }, [year, month]);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const cells = useMemo(() => {
    const result = [];

    // Blank days before month start
    for (let i = 0; i < firstDayOfWeek; i++) {
      result.push(<div key={`empty-${i}`} className={styles.empty}></div>);
    }

    // Each day cell
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const currentDate = new Date(currentYear, currentMonth - 1, day);

      let status;
      if (currentDate > today) {
        status = "noData";
      } else {
        const rawVal = safeAttendanceMap[dateStr];

if (rawVal === true) {
  status = "present";
} 
else if (
  rawVal === false &&
  ownerMarkedDates.includes(dateStr)
) {
  status = "ownerPresent"; // yellow
} 
else if (rawVal === false) {
  status = "absent";
} 
else {
  status = "noData";
}
      }

      let className = `${styles.day} ${styles[status]}`;
      const isToday =
        today.getFullYear() === currentYear &&
        today.getMonth() + 1 === currentMonth &&
        today.getDate() === day;

      if (isToday) className += " " + styles.today;

      result.push(
        <div key={dateStr} className={className}>
          {day}
        </div>
      );
    }

    return result;
  }, [attendanceMap, ownerMarkedDates, currentYear, currentMonth]);

  const monthLabels = [
    t("jan"), t("feb"), t("mar"), t("apr"), t("may"), t("jun"),
    t("jul"), t("aug"), t("sep"), t("oct"), t("nov"), t("dec")
  ];

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={handlePrevMonth} className={styles.navButton}>
          <ArrowLeft size={20} />
        </button>
        <span>
          {monthLabels[currentMonth - 1]} {currentYear}
        </span>
        <button onClick={handleNextMonth} className={styles.navButton}>
           <ArrowRight size={20}/>
        </button>
      </div>

      <div className={styles.grid}>
        {[t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")].map((d) => (
          <div key={d} className={styles.weekday}>
            {d}
          </div>
        ))}
        {cells}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.colorBox} ${styles.present}`}></span> {t("present")}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.colorBox} ${styles.absent}`}></span> {t("absent")}
        </span>
        <span className={styles.legendItem}>
  <span className={`${styles.colorBox} ${styles.ownerPresent}`}></span>
  {t("ownerMarked")}
</span>
        <span className={styles.legendItem}>
          <span className={`${styles.colorBox} ${styles.noData}`}></span> {t("noData")}
        </span>
      </div>
    </div>
  );
}
