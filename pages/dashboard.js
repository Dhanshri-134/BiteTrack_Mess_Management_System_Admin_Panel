// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import Sidebar from "../components/Sidebar";
// import Card from "../components/Card";
// import styles from "../styles/dashboardmain.module.css";
// import Layout from "../components/Layout";
// import useAuth from "../hooks/useAuth";
// import HardwareScanner from "../components/HardwareScanner"; 
// // Recharts imports
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
// } from "recharts";
// import { PieChart, Pie, Cell, Legend } from "recharts";


// export default function Dashboard() {
//   useAuth(); 

//   const [stats, setStats] = useState({
//     totalMembers: 0,
//     todayAttendance: 0,
//     monthlyRevenue: 0,
//     totalRevenue: 0,
//   });

//   const [alerts, setAlerts] = useState([]);
//   const [attendanceTrend, setAttendanceTrend] = useState([]);
//   const [revenueTrend, setRevenueTrend] = useState([]);
//   const [trendType, setTrendType] = useState("daily"); // "daily", "monthly", or "yearly"
//   const [foodStats, setFoodStats] = useState({ veg: 0, nonveg: 0 });
//   const [mess, setMess] = useState(null);


//   const fetchFoodStats = async () => {
//     try {
//       const res = await fetch("/api/users/foodPreference");
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to fetch food stats");
//       setFoodStats(data);
//     } catch (err) {
//       console.error("Error fetching food stats:", err);
//     }
//   };


//   // const handleScan = async (qr) => {
//   //   try {
//   //     const res = await fetch("/api/attendance/mark", {
//   //       method: "POST",
//   //       headers: { "Content-Type": "application/json" },
//   //       body: JSON.stringify({ qr }),
//   //     });
//   //     const data = await res.json();

//   //     if (!res.ok) throw new Error(data.error || "Failed to mark attendance");
//   //     fetchStats();
//   //     fetchAttendance();
//   //   } catch (err) {
//   //     console.error("Error marking attendance:", err);
//   //   }
//   // };
//   const fetchMessInfo = async () => {
//       try {
//         const token = localStorage.getItem("token"); 
//         const res = await fetch("/api/mess/info", {
//           method: "GET",
//           headers: {
//              Authorization: `Bearer ${token}`,},

//         });

//         const data = await res.json();
//         if (res.ok) {
//           setMess(data);
//         } else {
//           console.error(data.error);
//         }
//       } catch (err) {
//         console.error("Fetch error:", err);
//       }
//     };
  
//   const fetchStats = async () => {
//   try {
//     const [usersRes, attendanceRes, billsRes] = await Promise.all([
//       fetch("/api/users/count"),
//       fetch("/api/attendance/fetch"),
//       fetch("/api/bills/all"),
//     ]);

//     const usersData = await usersRes.json();
//     const attendanceData = await attendanceRes.json();
//     const billsData = await billsRes.json();

//     // Common date keys
//     const keys = ["generated_at", "bill_date", "date", "created_at", "att_date"];

//     const getDate = (obj) => {
//       for (const k of keys) {
//         if (obj[k]) {
//           const d = new Date(obj[k]);
//           if (!isNaN(d)) return d;
//         }
//       }
//       return null;
//     };

//     // --- Basic Stats ---
//     const today = new Date().toISOString().slice(0, 10);
//     const todayCount = attendanceData.filter((r) => r.att_date === today).length;

//     const totalRevenue = billsData.reduce(
//       (sum, b) => sum + Number(b.total_amount || b.amount || 0),
//       0
//     );

//     const now = new Date();

//     const monthlyRevenue = billsData
//       .filter((b) => {
//         const dateField = keys.find((k) => b[k]);
//         if (!dateField) return false;
//         const billDate = new Date(b[dateField]);
//         return (
//           billDate.getMonth() === now.getMonth() &&
//           billDate.getFullYear() === now.getFullYear()
//         );
//       })
//       .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

//     // --- Alerts ---
//     const uniqueUsers = [...new Set(attendanceData.map((r) => r.user_id))];
//     const inactiveCount = uniqueUsers.filter((uid) => {
//       const records = attendanceData.filter((r) => r.user_id === uid);
//       const lastSeen = new Date(
//         Math.max(...records.map((r) => getDate(r)?.getTime() || 0))
//       );
//       return (new Date() - lastSeen) / (1000 * 60 * 60 * 24) > 10;
//     }).length;

//     const alertsList =
//       inactiveCount > 0
//         ? [`⚠️ ${inactiveCount} members inactive for 10+ days`]
//         : [];

//     // // --- Monthly Attendance Trend ---
//     // const last6Months = [...Array(6)].map((_, i) => {
//     //   const d = new Date();
//     //   d.setMonth(d.getMonth() - (5 - i));
//     //   const month = d.getMonth();
//     //   const year = d.getFullYear();

//     //   const count = attendanceData.filter((r) => {
//     //     const date = getDate(r);
//     //     return date && date.getMonth() === month && date.getFullYear() === year;
//     //   }).length;

//     //   return {
//     //     month: d.toLocaleDateString("en-IN", { month: "short" }),
//     //     attendance: count,
//     //   };
//     // });

//     // setAttendanceTrend(last6Months);

//     // --- Attendance Trends ---
// const buildTrends = (data) => {
//   const now = new Date();
//   const getDate = (d) => new Date(d.att_date);

//   // --- Daily (last 7 days)
//   const dailyTrend = [...Array(7)].map((_, i) => {
//     const d = new Date();
//     d.setDate(d.getDate() - (6 - i));
//     const dayKey = d.toISOString().slice(0, 10);
//     const count = data.filter((r) => r.att_date === dayKey).length;
//     return {
//       label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
//       attendance: count,
//     };
//   });

//   // --- Monthly (last 6 months)
//   const monthlyTrend = [...Array(6)].map((_, i) => {
//     const d = new Date();
//     d.setMonth(d.getMonth() - (5 - i));
//     const month = d.getMonth();
//     const year = d.getFullYear();

//     const count = data.filter((r) => {
//       const date = getDate(r);
//       return date && date.getMonth() === month && date.getFullYear() === year;
//     }).length;

//     return {
//       label: d.toLocaleDateString("en-IN", { month: "short" }),
//       attendance: count,
//     };
//   });

//   // --- Yearly (last 3 years)
//   const yearlyTrend = [...Array(3)].map((_, i) => {
//     const year = now.getFullYear() - (2 - i);
//     const count = data.filter((r) => {
//       const date = getDate(r);
//       return date && date.getFullYear() === year;
//     }).length;

//     return {
//       label: `${year}`,
//       attendance: count,
//     };
//   });

//   return { dailyTrend, monthlyTrend, yearlyTrend };
// };

// const { dailyTrend, monthlyTrend, yearlyTrend } = buildTrends(attendanceData);
// setAttendanceTrend({ dailyTrend, monthlyTrend, yearlyTrend });


//     // --- Monthly Revenue Trend ---
//     const revTrend = [...Array(6)].map((_, i) => {
//       const d = new Date();
//       d.setMonth(d.getMonth() - (5 - i));
//       const month = d.getMonth();
//       const year = d.getFullYear();

//       const revenue = billsData
//         .filter((b) => {
//           const billDate = getDate(b);
//           return billDate && billDate.getMonth() === month && billDate.getFullYear() === year;
//         })
//         .reduce((sum, b) => sum + Number(b.total_amount || b.amount || 0), 0);

//       return {
//         month: d.toLocaleDateString("en-IN", { month: "short" }),
//         revenue: parseFloat(revenue.toFixed(2)),
//       };
//     });

//     setRevenueTrend(revTrend);

//     // --- Final State ---
//     setStats({
//       totalMembers: usersData.count || 0,
//       todayAttendance: todayCount,
//       monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
//       totalRevenue: parseFloat(totalRevenue.toFixed(2)),
//     });

//     setAlerts(alertsList);
//   } catch (err) {
//     console.error("Error fetching stats:", err);
//   }
// };


  

//   useEffect(() => {
//     fetchMessInfo();
//     fetchStats();
//     fetchFoodStats();
//   }, []);

//   const router = useRouter();

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <main className={styles.main}>
//           <h1>Dashboard Overview</h1>

//           {/* Stat Cards */}
//           <div className={styles.cards}>
//             <Card title="Total Members" value={stats.totalMembers} />
//             <Card title="Today's Attendance" value={stats.todayAttendance} />
//             <Card title="Monthly Revenue" value={`Rs. ${stats.monthlyRevenue.toFixed(2)}`} />
//             <Card title="Total Revenue" value={`Rs. ${stats.totalRevenue.toFixed(2)}`} />
//           </div>

//           {/* Alerts */}
//           {alerts.length > 0 && (
//             <section className={styles.section}>
//               <h2>Alerts</h2>
//               {alerts.map((a, i) => (
//                 <div key={i} className={styles.alert}>{a}</div>
//               ))}
//             </section>
//           )}

//   {/* <HardwareScanner onScan={handleScan} /> */}
         
//           {/* Monthly Attendance Trend */}
//           {/* <section className={styles.section}>
//             <h2>Monthly Attendance Trend (Last 6 Months)</h2>
//             <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={attendanceTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="month" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="attendance" fill="#3b82f6" radius={[10, 10, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </section> */}

//           <section className={styles.section}>
//   <div className={styles.trendHeader}>
//     <h2>Attendance Trend</h2>
//     <div className={styles.trendTabs}>
//       {["daily", "monthly", "yearly"].map((type) => (
//         <button
//           key={type}
//           onClick={() => setTrendType(type)}
//           className={`${styles.trendTab} ${
//             trendType === type ? styles.trendTabActive : ""
//           }`}
//         >
//           {type.charAt(0).toUpperCase() + type.slice(1)}
//         </button>
//       ))}
//       <div
//         className={`${styles.trendActiveBg} ${
//           trendType === "daily"
//             ? styles.dailyActive
//             : trendType === "monthly"
//             ? styles.monthlyActive
//             : styles.yearlyActive
//         }`}
//       />
//     </div>
//   </div>

//   <ResponsiveContainer width="100%" height={320}>
//     <BarChart
//       data={
//         trendType === "daily"
//           ? attendanceTrend.dailyTrend
//           : trendType === "monthly"
//           ? attendanceTrend.monthlyTrend
//           : attendanceTrend.yearlyTrend
//       }
//       margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
//     >
//       <CartesianGrid strokeDasharray="3 3" />
//       <XAxis dataKey="label" />
//       <YAxis />
//       <Tooltip />
//       <Bar dataKey="attendance" fill="#3b82f6" radius={[10, 10, 0, 0]} />
//     </BarChart>
//   </ResponsiveContainer>
// </section>



//           {/* Revenue Trend */}
//           <section className={styles.section}>
//             <h2>Revenue Trend (Last 6 Months)</h2>
//             <ResponsiveContainer width="100%" height={300}>
//               <LineChart data={revenueTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="month" />
//                 <YAxis />
//                 <Tooltip />
//                 <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
//               </LineChart>
//             </ResponsiveContainer>
//           </section>

//           {/* Profile / System Info */}
//           {/* Veg / Non-Veg Count */}
// {/* Veg / Non-Veg Overview */}
// <section className={styles.section}>
//   <h2 className={styles.sectionTitle}>Meal Preference Overview</h2>

//   <div className={styles.foodStatsCard}>
//     <ResponsiveContainer width="100%" height={280}>
//       <PieChart>
//         <Pie
//           data={[
//             { name: "Veg", value: foodStats.veg },
//             { name: "Non-Veg", value: foodStats.nonveg },
//           ]}
//           cx="50%"
//           cy="50%"
//           innerRadius={85}
//           outerRadius={120}
//           startAngle={90}
//           endAngle={450}
//           dataKey="value"
//           stroke="none"
//           animationDuration={900}
//           labelLine={false}
//         >
//           <Cell fill="#16a34a" />
//           <Cell fill="#dc2626" />
//         </Pie>

//         {/* Center Total Count */}
//         <text
//           x="50%"
//           y="48%"
//           textAnchor="middle"
//           dominantBaseline="middle"
//           fontSize="28"
//           fontWeight="700"
//           fill="#1e293b"
//         >
//           {foodStats.veg + foodStats.nonveg}
//         </text>
//         <text
//           x="50%"
//           y="60%"
//           textAnchor="middle"
//           fontSize="14"
//           fill="#6b7280"
//         >
//           Total Members
//         </text>
//       </PieChart>
//     </ResponsiveContainer>

//     {/* Combined Legend + Summary */}
//     <div className={styles.foodSummary}>
//       <div
//         className={`${styles.summaryItem} ${
//           foodStats.veg > foodStats.nonveg ? styles.major : ""
//         }`}
//       >
//         <div className={styles.legendHeader}>
//           <span className={styles.vegDot}></span>
//           <strong>Veg</strong>
//         </div>
//         <p className={styles.summaryCount}>{foodStats.veg}</p>
//         <p className={styles.summaryPercent}>
//           {Math.round(
//             (foodStats.veg /
//               (foodStats.veg + foodStats.nonveg || 1)) * 100
//           )}
//           %
//         </p>
//       </div>

//       <div
//         className={`${styles.summaryItem} ${
//           foodStats.nonveg > foodStats.veg ? styles.major : ""
//         }`}
//       >
//         <div className={styles.legendHeader}>
//           <span className={styles.nonVegDot}></span>
//           <strong>Non-Veg</strong>
//         </div>
//         <p className={styles.summaryCount}>{foodStats.nonveg}</p>
//         <p className={styles.summaryPercent}>
//           {Math.round(
//             (foodStats.nonveg /
//               (foodStats.veg + foodStats.nonveg || 1)) * 100
//           )}
//           %
//         </p>
//       </div>
//     </div>
//   </div>
// </section>


//          <section className={styles.section}>
//   <h2>Mess Info</h2>

//   {!mess ? (
//             <p>Loading...</p>
//           ) : (
//             <div className={styles.profileCard}>
//               <p><strong>Mess Name:</strong> {mess.name}</p>
//               <p><strong>Email:</strong> {mess.email}</p>
//               <p><strong>Phone:</strong> {mess.contact_info}</p>
//               <p><strong>Address:</strong> {mess.location}</p>
//               <p><strong>Working Hours:</strong> {mess.open_time}</p>
//               <p><strong>Per Day Rate:</strong> ₹{Number(mess.per_day_rate || 0).toFixed(2)}</p>
//             </div>
//           )}
// </section>




//         </main>
//       </div>
//     </Layout>
//   );
// }




import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import Card from "../components/Card";
import styles from "../styles/dashboardmain.module.css";
import Layout from "../components/Layout";
import useAuth from "../hooks/useAuth";
import HardwareScanner from "../components/HardwareScanner"; 
// Recharts imports
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { PieChart, Pie, Cell, Legend } from "recharts";

export default function Dashboard() {
  useAuth(); 

  const [stats, setStats] = useState({
    totalMembers: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [trendType, setTrendType] = useState("daily"); // "daily", "monthly", or "yearly"
  const [foodStats, setFoodStats] = useState({ veg: 0, nonveg: 0 });
  const [mess, setMess] = useState(null);

  const getToken = () => localStorage.getItem("token");

  const fetchFoodStats = async () => {
    const token = getToken();
    if (!token) {
      console.warn("No token present — cannot fetch food stats");
      return;
    }

    try {
      const res = await fetch("/api/users/foodPreference", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch food stats");
      setFoodStats(data);
    } catch (err) {
      console.error("Error fetching food stats:", err);
    }
  };

  const fetchMessInfo = async () => {
    try {
      const token = getToken();
      if (!token) return console.warn("Session expired! Please login again.");

      const res = await fetch("/api/mess/info", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setMess(data);
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const fetchStats = async () => {
    const token = getToken();
    if (!token) {
      console.warn("Session expired! Please login again.");
      return;
    }

    try {
      // send token for all requests
      const [usersRes, attendanceRes, billsRes] = await Promise.all([
        fetch("/api/users/count", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/attendance/fetch", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/bills/all", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!usersRes.ok) {
        const err = await usersRes.text();
        throw new Error(`users/count failed: ${err}`);
      }
      if (!attendanceRes.ok) {
        const err = await attendanceRes.text();
        throw new Error(`attendance/fetch failed: ${err}`);
      }
      if (!billsRes.ok) {
        const err = await billsRes.text();
        throw new Error(`bills/all failed: ${err}`);
      }

      const usersData = await usersRes.json();
      const attendanceData = await attendanceRes.json();
      const billsData = await billsRes.json();

      // Common date keys
      const keys = ["generated_at", "bill_date", "date", "created_at", "att_date"];

      const getDateFromObj = (obj) => {
        if (!obj) return null;
        for (const k of keys) {
          if (obj[k]) {
            const d = new Date(obj[k]);
            if (!isNaN(d)) return d;
          }
        }
        return null;
      };

      // --- Basic Stats ---
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = attendanceData.filter((r) => {
        // normalize att_date to YYYY-MM-DD string
        const att = r.att_date ? new Date(r.att_date).toISOString().slice(0, 10) : null;
        return att === today;
      }).length;

      const totalRevenue = billsData.reduce(
        (sum, b) => sum + Number(b.total_amount || b.amount || 0),
        0
      );

      const now = new Date();

      const monthlyRevenue = billsData
        .filter((b) => {
          const dateField = keys.find((k) => b[k]);
          if (!dateField) return false;
          const billDate = new Date(b[dateField]);
          return (
            billDate.getMonth() === now.getMonth() &&
            billDate.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

      // --- Alerts ---
      const uniqueUsers = [...new Set(attendanceData.map((r) => r.user_id))];
      const inactiveCount = uniqueUsers.filter((uid) => {
        const records = attendanceData.filter((r) => r.user_id === uid);
        const lastSeenMs = Math.max(
          ...records.map((r) => {
            const d = getDateFromObj(r);
            return d ? d.getTime() : 0;
          })
        );
        if (lastSeenMs === 0) return true; // never seen -> consider inactive
        return (new Date() - new Date(lastSeenMs)) / (1000 * 60 * 60 * 24) > 10;
      }).length;

      const alertsList =
        inactiveCount > 0
          ? [`⚠️ ${inactiveCount} members inactive for 10+ days`]
          : [];

      // --- Attendance Trends builder ---
      const buildTrends = (data) => {
        const now = new Date();
        const getDateKey = (r) => {
          if (!r) return null;
          if (r.att_date) return new Date(r.att_date);
          return getDateFromObj(r);
        };

        // daily (last 7 days)
        const dailyTrend = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dayKey = d.toISOString().slice(0, 10);
          const count = data.filter((r) => {
            const dt = getDateKey(r);
            return dt && dt.toISOString().slice(0, 10) === dayKey;
          }).length;
          return {
            label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            attendance: count,
          };
        });

        // monthly (last 6 months)
        const monthlyTrend = [...Array(6)].map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          const month = d.getMonth();
          const year = d.getFullYear();
          const count = data.filter((r) => {
            const dt = getDateKey(r);
            return dt && dt.getMonth() === month && dt.getFullYear() === year;
          }).length;
          return {
            label: d.toLocaleDateString("en-IN", { month: "short" }),
            attendance: count,
          };
        });

        // yearly (last 3 years)
        const yearlyTrend = [...Array(3)].map((_, i) => {
          const year = now.getFullYear() - (2 - i);
          const count = data.filter((r) => {
            const dt = getDateKey(r);
            return dt && dt.getFullYear() === year;
          }).length;
          return { label: `${year}`, attendance: count };
        });

        return { dailyTrend, monthlyTrend, yearlyTrend };
      };

      const { dailyTrend, monthlyTrend, yearlyTrend } = buildTrends(attendanceData);
      setAttendanceTrend({ dailyTrend, monthlyTrend, yearlyTrend });

      // --- Monthly Revenue Trend ---
      const revTrend = [...Array(6)].map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const month = d.getMonth();
        const year = d.getFullYear();

        const revenue = billsData
          .filter((b) => {
            const billDate = getDateFromObj(b);
            return billDate && billDate.getMonth() === month && billDate.getFullYear() === year;
          })
          .reduce((sum, b) => sum + Number(b.total_amount || b.amount || 0), 0);

        return {
          month: d.toLocaleDateString("en-IN", { month: "short" }),
          revenue: parseFloat(revenue.toFixed(2)),
        };
      });

      setRevenueTrend(revTrend);

      // --- Final State ---
      setStats({
        totalMembers: usersData.count || 0,
        todayAttendance: todayCount,
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      });

      setAlerts(alertsList);
    } catch (err) {
      console.error("Error fetching stats:", err);
      // optional: show a user-friendly error toast here
    }
  };

  useEffect(() => {
    fetchMessInfo();
    fetchStats();
    fetchFoodStats();
  }, []);

  const router = useRouter();

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>Dashboard Overview</h1>

          {/* Stat Cards */}
          <div className={styles.cards}>
            <Card title="Total Members" value={stats.totalMembers} />
            <Card title="Today's Attendance" value={stats.todayAttendance} />
            <Card title="Monthly Revenue" value={`Rs. ${stats.monthlyRevenue.toFixed(2)}`} />
            <Card title="Total Revenue" value={`Rs. ${stats.totalRevenue.toFixed(2)}`} />
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <section className={styles.section}>
              <h2>Alerts</h2>
              {alerts.map((a, i) => (
                <div key={i} className={styles.alert}>{a}</div>
              ))}
            </section>
          )}

          {/* Attendance Trend */}
          <section className={styles.section}>
            <div className={styles.trendHeader}>
              <h2>Attendance Trend</h2>
              <div className={styles.trendTabs}>
                {["daily", "monthly", "yearly"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTrendType(type)}
                    className={`${styles.trendTab} ${
                      trendType === type ? styles.trendTabActive : ""
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
                <div
                  className={`${styles.trendActiveBg} ${
                    trendType === "daily"
                      ? styles.dailyActive
                      : trendType === "monthly"
                      ? styles.monthlyActive
                      : styles.yearlyActive
                  }`}
                />
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={
                  trendType === "daily"
                    ? attendanceTrend.dailyTrend
                    : trendType === "monthly"
                    ? attendanceTrend.monthlyTrend
                    : attendanceTrend.yearlyTrend
                }
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="attendance" fill="#3b82f6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Revenue Trend */}
          <section className={styles.section}>
            <h2>Revenue Trend (Last 6 Months)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrend} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Meal Preference Overview */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Meal Preference Overview</h2>

            <div className={styles.foodStatsCard}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Veg", value: foodStats.veg },
                      { name: "Non-Veg", value: foodStats.nonveg },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={120}
                    startAngle={90}
                    endAngle={450}
                    dataKey="value"
                    stroke="none"
                    animationDuration={900}
                    labelLine={false}
                  >
                    <Cell fill="#16a34a" />
                    <Cell fill="#dc2626" />
                  </Pie>

                  {/* Center Total Count */}
                  <text
                    x="50%"
                    y="48%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="28"
                    fontWeight="700"
                    fill="#1e293b"
                  >
                    {foodStats.veg + foodStats.nonveg}
                  </text>
                  <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    fontSize="14"
                    fill="#6b7280"
                  >
                    Total Members
                  </text>
                </PieChart>
              </ResponsiveContainer>

              {/* Combined Legend + Summary */}
              <div className={styles.foodSummary}>
                <div
                  className={`${styles.summaryItem} ${
                    foodStats.veg > foodStats.nonveg ? styles.major : ""
                  }`}
                >
                  <div className={styles.legendHeader}>
                    <span className={styles.vegDot}></span>
                    <strong>Veg</strong>
                  </div>
                  <p className={styles.summaryCount}>{foodStats.veg}</p>
                  <p className={styles.summaryPercent}>
                    {Math.round(
                      (foodStats.veg / (foodStats.veg + foodStats.nonveg || 1)) * 100
                    )}
                    %
                  </p>
                </div>

                <div
                  className={`${styles.summaryItem} ${
                    foodStats.nonveg > foodStats.veg ? styles.major : ""
                  }`}
                >
                  <div className={styles.legendHeader}>
                    <span className={styles.nonVegDot}></span>
                    <strong>Non-Veg</strong>
                  </div>
                  <p className={styles.summaryCount}>{foodStats.nonveg}</p>
                  <p className={styles.summaryPercent}>
                    {Math.round(
                      (foodStats.nonveg / (foodStats.veg + foodStats.nonveg || 1)) * 100
                    )}
                    %
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Mess Info</h2>

            {!mess ? (
              <p>Loading...</p>
            ) : (
              <div className={styles.profileCard}>
                <p><strong>Mess Name:</strong> {mess.name}</p>
                <p><strong>Email:</strong> {mess.email}</p>
                <p><strong>Phone:</strong> {mess.contact_info}</p>
                <p><strong>Address:</strong> {mess.location}</p>
                <p><strong>Working Hours:</strong> {mess.open_time}</p>
                <p><strong>Per Day Rate:</strong> ₹{Number(mess.per_day_rate || 0).toFixed(2)}</p>
              </div>
            )}
          </section>

        </main>
      </div>
    </Layout>
  );
}
