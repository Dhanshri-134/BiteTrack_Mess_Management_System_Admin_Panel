import { useEffect, useState } from "react";
import Scanner from "./scan";
import HardwareScanner from "../components/HardwareScanner";
import styles from "../styles/attendance.module.css";
import Layout from "../components/Layout";
import { offlineFetch } from "@/lib/offlineFetch";
import { queueAction } from "@/lib/queueAction";
import { useLanguage } from "../context/LanguageContext";

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ totalMembers: 0, todayAttendance: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [recentUsers, setRecentUsers] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useLanguage();

  /* ------------------ RESPONSIVE ------------------ */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchAttendance = async () => {
    try {
      const data = await offlineFetch("attendance-fetch", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/attendance/fetch/",
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error("Failed to fetch records");
        return res.json();
      });

      setRecords(data);

      const today = new Date().toISOString().slice(0, 10);
      const todayCount = data.filter((r) => r.att_date === today).length;

      const membersData = await offlineFetch("users-count", async () => {
        const membersRes = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/count/",
          { headers: authHeaders() }
        );
        if (!membersRes.ok) throw new Error("Failed to fetch member count");
        return membersRes.json();
      });

      setStats({
        totalMembers: membersData.count,
        todayAttendance: todayCount,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleScan = async (qr) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/attendance/mark/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qr }),
        }
      );


      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || t("attendanceMarked"));

        const parts = qr.split("-");
        const userId = parts.length === 2 ? Number(parts[1]) : null;

        if (userId) {
          const token = localStorage.getItem("token");

const namesRes = await fetch(
  "https://bite-track-mess-management-system-a.vercel.app/api/users/names/",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userIds: [userId] }),
  }
);

          const namesData = await namesRes.json();
          setRecentUsers(namesData.names || []);
        } else {
          setRecentUsers([]);
        }

        fetchAttendance();
      }
    } catch (err) {
      await queueAction({
        type: "ATTENDANCE_SCAN",
        payload: { qr },
      });

      setMessage(t("attendanceSavedOffline"));
      const parts = qr.split("-");
  const userId = parts.length === 2 ? Number(parts[1]) : null;

  if (userId) {
    setRecords(prev => [
      ...prev,
      {
        id: `offline-${Date.now()}`,
        user_id: userId,
        user_name: t("offlineUser"),
        att_date: today,
      },
    ]);
  }

  setRecentUsers([]);
    }
  };

  function splitRecords(records, columns = 3) {
    const result = Array.from({ length: columns }, () => []);
    records.forEach((rec, i) => {
      result[i % columns].push(rec);
    });
    return result;
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.att_date === today);
  const chunks = splitRecords(todayRecords, 3);

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{t("attendance")}</h1>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles["stat-card"]}>
              <h3>{t("totalMembers")}</h3>
              <p>{stats.totalMembers}</p>
            </div>
            <div className={styles["stat-card"]}>
              <h3>{t("todaysAttendance")}</h3>
              <p>{stats.todayAttendance}</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={styles.messageBanner}>
              <p>{message}</p>
              {recentUsers.length > 0 && (
                <p>
                  {t("usersMarked")}: {recentUsers.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Scanner */}
          <section className={styles.scannerSection}>
            <h3 className={styles.scannerTitle}>
              {t("markAttendance")}
            </h3>
            <p className={styles.scannerInstructions}>
              {t("scannerInstructions")}
            </p>

            <div className={styles.scannerWrapper}>
              <Scanner onAttendanceMarked={handleScan} />
              <HardwareScanner onScan={handleScan} />
            </div>
          </section>

          {/* Attendance Table */}
          <section>
            <h2>
              {t("attendanceRecord")} ({today})
            </h2>

            {loading ? (
              <div className={styles.loading}>
                {t("loading")}
              </div>
            ) : todayRecords.length === 0 ? (
              <div className={styles.empty}>
                {t("noRecords")}
              </div>
            ) : isMobile ? (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th>{t("srNo")}</th>
                      <th>{t("name")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecords.map((r, idx) => (
                      <tr key={r.id}>
                        <td>{idx + 1}</td>
                        <td>{r.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.tableScroll}>
                <div className={styles.multiTableWrapper}>
                  {chunks.map((chunk, colIdx) => (
                    <table key={colIdx} className={styles.table}>
                      <thead>
                        <tr className={styles.tableHeader}>
                          <th>{t("srNo")}</th>
                          <th>{t("name")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.map((r, idx) => (
                          <tr key={r.id}>
                            <td>
                              {idx +
                                colIdx *
                                  Math.ceil(todayRecords.length / 3) +
                                1}
                            </td>
                            <td>{r.user_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </Layout>
  );
}

// import { useEffect, useState } from "react";
// import Scanner from "./scan"; // camera-based
// import HardwareScanner from "../components/HardwareScanner"; // new
// import styles from "../styles/attendance.module.css";
// import Layout from "../components/Layout";
// import { offlineFetch } from "@/lib/offlineFetch";
// import { queueAction } from "@/lib/queueAction";

// export default function AttendancePage() {
//   const [records, setRecords] = useState([]);
//   const [stats, setStats] = useState({ totalMembers: 0, todayAttendance: 0 });
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState(""); 
//   const [recentUsers, setRecentUsers] = useState([]); 

//   const authHeaders = () => {
//   const token = localStorage.getItem("token");
//   return {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${token}`,
//   };
// };

//   const fetchAttendance = async () => {
//     try {
//       // const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/fetch");
//       // const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/fetch/", { headers: authHeaders() });
//       // // const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/attendance/monthly?year=${year}&month=${month}`);
//       // if (!res.ok) throw new Error("Failed to fetch records");
//       // const data = await res.json();
//       const data = await offlineFetch(
//         "attendance-fetch", // cache key (string, nothing else)
//         async () => {
//           const res = await fetch(
//             "https://bite-track-mess-management-system-a.vercel.app/api/attendance/fetch/",
//             { headers: authHeaders() }
//           );
//           if (!res.ok) throw new Error("Failed to fetch records");
//           return res.json();
//         }
//       );

//       setRecords(data);

//       const today = new Date().toISOString().slice(0, 10);
//       const todayCount = data.filter((r) => r.att_date === today).length;

//       // const membersRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/count");
//       // const membersRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/count/", { headers: authHeaders() })
//       // const membersData = await membersRes.json();

//       const membersData = await offlineFetch(
//   "users-count",
//   async () => {
//     const membersRes = await fetch(
//       "https://bite-track-mess-management-system-a.vercel.app/api/users/count/",
//       { headers: authHeaders() }
//     );
//     if (!membersRes.ok) throw new Error("Failed to fetch member count");
//     return membersRes.json();
//   }
// );


//       setStats({ totalMembers: membersData.count, todayAttendance: todayCount });
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);
  
//   const fetchData = async () =>{
//     fetchAttendance();
    
//   }

// const handleScan = async (qr) => {
//   try {
//     const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/mark/", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ qr }),
//     });
//     const data = await res.json();

//     if (res.ok) {
//       setMessage(data.message || "Attendance marked successfully");

//       // extract single userId from QR
//       const parts = qr.split("-");
//       const userId = parts.length === 2 ? Number(parts[1]) : null;

//       if (userId) {
//         const namesRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/names/", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ userIds: [userId] }), // single-element array
//         });
//         const namesData = await namesRes.json();
//         setRecentUsers(namesData.names || []);
//       } else {
//         setRecentUsers([]);
//       }
//     // } else {
//     //   setMessage(data.error || "Failed to mark attendance");
//     //   setRecentUsers([]);
//     // }
//     fetchAttendance();
// }
//   } catch (err) {
//     // console.error("Error marking attendance:", err);
//     // setMessage("Something went wrong");
//     // setRecentUsers([]);
//     await queueAction({
//       type: "ATTENDANCE_SCAN",
//       payload: { qr },
//     });

//     setMessage("Attendance saved offline");
//     setRecentUsers([]); 
//   }
// };


// // Split an array into N roughly equal chunks (columns)
// function splitRecords(records, columns = 3) {
//   const result = Array.from({ length: columns }, () => []);
//   records.forEach((rec, i) => {
//     result[i % columns].push(rec);
//   });
//   return result;
// }





//   return (
//     <Layout>
//       <div className={styles.container}>
//         <main className={styles.main}>
//           <h1>Attendance Dashboard</h1>

//           {/* Stats */}
//           <div className={styles.stats}>
//             <div className={styles["stat-card"]}>
//               <h3>Total Members</h3>
//               <p>{stats.totalMembers}</p>
//             </div>
//             <div className={styles["stat-card"]}>
//               <h3>Today's Attendance</h3>
//               <p>{stats.todayAttendance}</p>
//             </div>
//           </div>
//       {/* <button
//               className={styles.generateButton}
//               onClick={handleUpdateAttendance}
//             >
//               Update Attendance (Process Previous Day)
//             </button> */}
//           {/* Message banner */}
//           {message && (
//             <div className={styles.messageBanner}>
//               <p>{message}</p>
//               {recentUsers.length > 0 && (
//                 <p>Users marked: {recentUsers.join(", ")}</p>
//               )}
//             </div>
//           )}

//           {/* Scanner */}
//           <section className={styles.scannerSection}>
//             <h3 className={styles.scannerTitle}>Mark Attendance</h3>
//             <p className={styles.scannerInstructions}>
//               Scan student QR code using either a camera or Bluetooth scanner.
//             </p>

//             <div className={styles.scannerWrapper}>
//               {/* Camera-based */}
//               <Scanner onAttendanceMarked={handleScan} />

//               {/* Hardware scanner */}
//               <HardwareScanner onScan={handleScan} />
//             </div>
//           </section>

//          {/* Attendance Table for a Specific Date, split into columns */}
// {/* Attendance Table for a Specific Date, split into columns */}
// <section>
//   <h2>Attendance Record ({new Date().toISOString().slice(0, 10)})</h2>

//   {loading ? (
//     <div className={styles.loading}>Loading...</div>
//   ) : records.filter(r => r.att_date === new Date().toISOString().slice(0, 10)).length === 0 ? (
//     <div className={styles.empty}>No records for this date</div>
//   ) : (
//     (() => {
//       const todayRecords = records.filter(r => r.att_date === new Date().toISOString().slice(0, 10));
//       const chunks = splitRecords(todayRecords, 3); // 3-column layout

//       return (
//         <div className={styles.tableScroll}>
//         <div className={styles.multiTableWrapper}>
//           {chunks.map((chunk, colIdx) => (
//             <table key={colIdx} className={styles.table}>
//               <thead>
//                 <tr className={styles.tableHeader}>
//                   <th>Sr. No.</th>
//                   <th>Name</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {chunk.map((r, idx) => (
//                   <tr key={r.id}>
//                     <td>{idx + colIdx * Math.ceil(todayRecords.length / 3) + 1}</td>
//                     <td>{r.user_name}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           ))}
//         </div>
//         </div>
//       );
//     })()
//   )}
// </section>



//         </main>
//       </div>
//     </Layout>
//   );
// }
