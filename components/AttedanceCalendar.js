// import React from "react";
// import styles from "../styles/AttendanceCalendar.module.css";

// export default function AttendanceCalendar({ year, month, attendanceMap = {} }) {
//   if (!year || !month) return null;

//   const daysInMonth = new Date(year, month, 0).getDate();
//   const today = new Date();
//   const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sunday

//   const cells = [];

//   // Fill blank days before month start
//   for (let i = 0; i < firstDayOfWeek; i++) {
//     cells.push(<div key={`empty-${i}`} className={styles.empty}></div>);
//   }

//   // Render each day
// //   for (let day = 1; day <= daysInMonth; day++) {
// //     const dateStr = new Date(year, month - 1, day).toISOString().slice(0, 10);
// //     const status = attendanceMap[dateStr]; // true = present, false = absent, undefined = no data
// // let className = styles.day;

// // if (status === "present") className += " " + styles.present;
// // else if (status === "absent") className += " " + styles.absent;
// // else className += " " + styles.noData;


// //     const isToday =
// //       today.getFullYear() === year &&
// //       today.getMonth() + 1 === month &&
// //       today.getDate() === day;

// //     if (isToday) className += " " + styles.today;

// //     cells.push(
// //       <div key={dateStr} className={className}>
// //         {day}
// //       </div>
// //     );
// //   }



// // for (let day = 1; day <= daysInMonth; day++) {
// //   const dateStr = new Date(year, month - 1, day).toISOString().slice(0, 10);

// //   const rawVal = attendanceMap[dateStr];
// //   let status;

// //   if (rawVal === true || rawVal === "true") status = "present";
// //   else if (rawVal === false || rawVal === "false") status = "absent";
// //   else status = "noData";

// //   let className = styles.day;

// //   if (status === "present") className += " " + styles.present;
// //   else if (status === "absent") className += " " + styles.absent;
// //   else className += " " + styles.noData;

// //   const isToday =
// //     today.getFullYear() === year &&
// //     today.getMonth() + 1 === month &&
// //     today.getDate() === day;

// //   if (isToday) className += " " + styles.today;

// //   cells.push(
// //     <div key={dateStr} className={className}>
// //       {day}
// //     </div>
// //   );
// // }

// for (let day = 1; day <= daysInMonth; day++) {
//   const dateStr = new Date(year, month - 1, day).toISOString().slice(0, 10);
//   const currentDate = new Date(year, month - 1, day);
//   const today = new Date();

//   let status;

//   // 🧩 If the date is in the future → mark as "noData"
//   if (currentDate > today) {
//     status = "noData";
//   } else {
//     const rawVal = attendanceMap[dateStr];

//     if (rawVal === true || rawVal === "true") status = "present";
//     else if (rawVal === false || rawVal === "false") status = "absent";
//     else status = "noData";
//   }

//   // Styling
//   let className = styles.day;
//   if (status === "present") className += " " + styles.present;
//   else if (status === "absent") className += " " + styles.absent;
//   else className += " " + styles.noData;

//   // Highlight today
//   const isToday =
//     today.getFullYear() === year &&
//     today.getMonth() + 1 === month &&
//     today.getDate() === day;

//   if (isToday) className += " " + styles.today;

//   cells.push(
//     <div key={dateStr} className={className}>
//       {day}
//     </div>
//   );
// }



//   return (
//     <div className={styles.calendar}>
//       <div className={styles.header}>
//         {new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })}
//       </div>
//       <div className={styles.grid}>
//         <div className={styles.weekday}>Sun</div>
//         <div className={styles.weekday}>Mon</div>
//         <div className={styles.weekday}>Tue</div>
//         <div className={styles.weekday}>Wed</div>
//         <div className={styles.weekday}>Thu</div>
//         <div className={styles.weekday}>Fri</div>
//         <div className={styles.weekday}>Sat</div>
//         {cells}
//       </div>
//       <div className={styles.legend}>
//         <span className={styles.legendItem}>
//           <span className={`${styles.colorBox} ${styles.present}`}></span> Present
//         </span>
//         <span className={styles.legendItem}>
//           <span className={`${styles.colorBox} ${styles.absent}`}></span> Absent
//         </span>
//         <span className={styles.legendItem}>
//           <span className={`${styles.colorBox} ${styles.noData}`}></span> No Data
//         </span>
//       </div>
//     </div>
//   );
// }

import React, { useState, useMemo } from "react";
import styles from "../styles/AttendanceCalendar.module.css";

export default function AttendanceCalendar({ attendanceMap = {} }) {
  const today = new Date();

  // Default to current month/year
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

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
      const dateStr = new Date(currentYear, currentMonth - 1, day)
        .toISOString()
        .slice(0, 10);
      const currentDate = new Date(currentYear, currentMonth - 1, day);

      let status;
      if (currentDate > today) {
        status = "noData";
      } else {
        const rawVal = attendanceMap[dateStr];
        if (rawVal === true || rawVal === "true") status = "present";
        else if (rawVal === false || rawVal === "false") status = "absent";
        else status = "noData";
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
  }, [attendanceMap, currentYear, currentMonth]);

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={handlePrevMonth} className={styles.navButton}>
          ← Prev
        </button>
        <span>
          {new Date(currentYear, currentMonth - 1).toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button onClick={handleNextMonth} className={styles.navButton}>
          Next →
        </button>
      </div>

      <div className={styles.grid}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className={styles.weekday}>
            {d}
          </div>
        ))}
        {cells}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.colorBox} ${styles.present}`}></span> Present
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.colorBox} ${styles.absent}`}></span> Absent
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.colorBox} ${styles.noData}`}></span> No Data
        </span>
      </div>
    </div>
  );
}
