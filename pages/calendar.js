// components/Calendar.js
import { useState, useEffect } from "react";
import styles from "../styles/calendar.module.css"; // create a simple CSS file
import { useLanguage } from "../context/LanguageContext";

export default function Calendar({ userId, year, month }) {
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  // useEffect(() => {
  //   async function fetchAttendance() {
  //     setLoading(true);
  //     try {
  //       const res = await fetch(
  //         `https://bite-track-mess-management-system-a.vercel.app/api/attendance/monthly?userId=${userId}&year=${year}&month=${month}/`
  //       );
  //       if (!res.ok) throw new Error("Failed to fetch attendance");
  //       const data = await res.json();
  //       setAttendanceMap(data.attendance_map || {});
  //     } catch (err) {
  //       console.error(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   if (userId && year && month) fetchAttendance();
  // }, [userId, year, month]);

  useEffect(() => {
    async function fetchAttendance() {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn(t("sessionExpired"));
          return;
        }

        const data = await offlineFetch(
          `attendance-calendar-${userId}-${year}-${month}`,
          async () => {
            const res = await fetch(
              `https://bite-track-mess-management-system-a.vercel.app/api/attendance/monthly?userId=${userId}&year=${year}&month=${month}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (!res.ok) {
              const err = await res.text();
              throw new Error(err || t("fetchAttendanceFailed"));
            }

            return res.json();
          }
        );

        setAttendanceMap(data?.attendance_map || {});
      } catch (err) {
        console.error(t("calendarFetchError"), err);
      } finally {
        setLoading(false);
      }
    }

    if (userId && year && month) fetchAttendance();
  }, [userId, year, month]);

  if (loading) return <div>{t("loadingCalendar")}</div>;

  // Create an array of days for the given month
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // First day of month to calculate starting weekday
  const firstDay = new Date(year, month - 1, 1).getDay();

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarGrid}>
        {/* Weekday headers */}
        {[t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")].map((d) => (
          <div key={d} className={styles.weekday}>
            {d}
          </div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDay }).map((_, idx) => (
          <div key={`empty-${idx}`} className={styles.emptyCell}></div>
        ))}

        {/* Days */}
        {daysArray.map((day) => {
          const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const attended = attendanceMap[dateKey];

          return (
            <div
              key={day}
              className={`${styles.dayCell} ${
                attended ? styles.calPresent : styles.calAbsent
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
