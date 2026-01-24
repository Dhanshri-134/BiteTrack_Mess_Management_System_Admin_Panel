// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import styles from "../styles/billing.module.css";
// import AttendanceCalendar from "../components/AttedanceCalendar";

// export default function BillsPage() {
//   const [bills, setBills] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [month, setMonth] = useState("");
//   const [year, setYear] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [sortField, setSortField] = useState("name");
//   const [sortOrder, setSortOrder] = useState("asc");
//   const [selectedAttendance, setSelectedAttendance] = useState(null);
//   const [recentUsers, setRecentUsers] = useState([]);
//   const [message, setMessage] = useState("");
//   // Helper: safely convert a value to integer days
//   const toIntDays = (v) => {
//     if (v == null) return 0;
//     // numeric already
//     if (typeof v === "number") return Math.max(0, Math.round(v));
//     // string that contains a number
//     if (typeof v === "string") {
//       // comma-separated list -> count entries
//       if (v.includes(",")) return v.split(",").filter(Boolean).length;
//       // space-separated list
//       if (v.includes(" ")) {
//         const parts = v.split(/\s+/).filter(Boolean);
//         // if they look like dates, count only valid dates
//         const asDates = parts.filter((p) => !Number.isNaN(new Date(p).getTime()));
//         return asDates.length > 0 ? asDates.length : parts.length;
//       }
//       // plain numeric string
//       const n = parseInt(v.replace(/[^0-9-]/g, ""), 10);
//       return Number.isNaN(n) ? 0 : Math.max(0, n);
//     }
//     // arrays -> length
//     if (Array.isArray(v)) return v.length;
//     // objects (map of dates -> bool)
//     if (typeof v === "object") return Object.values(v).filter(Boolean).length;
//     return 0;
//   };

//   // Helper: check if a date (string or Date) falls in month/year
//   const dateMatchesMonthYear = (dateVal, m, y) => {
//     if (!dateVal) return false;
//     const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
//     if (Number.isNaN(d.getTime())) return false;
//     if (!m || !y) return true; // if no filter, accept all
//     return d.getMonth() + 1 === Number(m) && d.getFullYear() === Number(y);
//   };

//   // // Robust day-counter: looks at many possible shapes of attendance data
//   // const countDaysForBill = (b, selectedM, selectedY) => {
//   //   const normalizeDateStr = (d) => {
//   //     if (!d) return null;
//   //     const dt = d instanceof Date ? d : new Date(d);
//   //     if (Number.isNaN(dt.getTime())) return null;
//   //     const yyyy = dt.getFullYear();
//   //     const mm = String(dt.getMonth() + 1).padStart(2, "0");
//   //     const dd = String(dt.getDate()).padStart(2, "0");
//   //     return `${yyyy}-${mm}-${dd}`;
//   //   };

//   //   const parseAttendanceMap = (att) => {
//   //     const map = {};
//   //     if (!att) return map;

//   //     if (typeof att === "string") {
//   //       const parts = att.split(/[\s,]+/).filter(Boolean);
//   //       for (const p of parts) {
//   //         const ds = normalizeDateStr(p);
//   //         if (ds) map[ds] = true;
//   //       }
//   //       return map;
//   //     }

//   //     if (Array.isArray(att)) {
//   //       for (const item of att) {
//   //         if (typeof item === "string") {
//   //           const ds = normalizeDateStr(item);
//   //           if (ds) map[ds] = true;
//   //         } else if (typeof item === "object" && item !== null) {
//   //           const dateVal = item.date || item.attendance_date || item.timestamp || item.day || item.date_time;
//   //           const presentFlag = item.present ?? item.is_present ?? (item.status ? String(item.status).toLowerCase().startsWith("p") : undefined);
//   //           const ds = normalizeDateStr(dateVal);
//   //           if (ds) map[ds] = presentFlag === undefined ? true : !!presentFlag;
//   //         }
//   //       }
//   //       return map;
//   //     }

//   //     if (typeof att === "object") {
//   //       for (const [k, v] of Object.entries(att)) {
//   //         const ds = normalizeDateStr(k);
//   //         if (!ds) continue;
//   //         if (typeof v === "boolean") map[ds] = v;
//   //         else if (typeof v === "number") map[ds] = v !== 0;
//   //         else if (typeof v === "string") {
//   //           const vs = v.toLowerCase();
//   //           map[ds] = vs === "true" || vs === "present" || vs.startsWith("p");
//   //         } else map[ds] = Boolean(v);
//   //       }
//   //       return map;
//   //     }

//   //     return map;
//   //   };

//   //   // Merge possible attendance sources
//   //   let attendanceMap = {};
//   //   if (b.attendance_map) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendance_map) };
//   //   if (b.attendance) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendance) };
//   //   if (b.present_dates) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.present_dates) };
//   //   if (b.attendance_days) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendance_days) };
//   //   if (b.attendanceMap) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendanceMap) };

//   //   const m = selectedM ? Number(selectedM) : (b.month ? Number(b.month) : (new Date().getMonth() + 1));
//   //   const y = selectedY ? Number(selectedY) : (b.year ? Number(b.year) : new Date().getFullYear());
//   //   if (Number.isNaN(m) || Number.isNaN(y)) return 0;

//   //   const monthLastDay = new Date(y, m, 0).getDate();

//   //   // Detect freeze date
//   //   const freezeCandidates = ["freeze_date", "frozen_at", "frozen_on", "freeze_on", "frozen_date"];
//   //   let freezeDate = null;
//   //   for (const f of freezeCandidates) {
//   //     if (b[f]) {
//   //       const ds = normalizeDateStr(b[f]);
//   //       if (ds) {
//   //         const dt = new Date(ds);
//   //         if (dt.getFullYear() === y && dt.getMonth() + 1 === m) {
//   //           freezeDate = ds;
//   //           break;
//   //         }
//   //       }
//   //     }
//   //   }

//   //   // Find first present day in month
//   //   const presentDates = Object.keys(attendanceMap)
//   //     .filter((d) => attendanceMap[d] && new Date(d).getMonth() + 1 === m && new Date(d).getFullYear() === y)
//   //     .sort();

//   //   console.log("User name is : " + (b.name || b.user_name || "unknown"));  

//   //   console.log("Present dates are : " + presentDates); 

//   //   if (presentDates.length === 0) return 0;
//   //   const firstPresent = new Date(presentDates[0]);

//   //   console.log("First present date is : " + firstPresent);

//   //   const endDate = freezeDate ? new Date(freezeDate) : new Date(y, m - 1, monthLastDay);
//   //   const oneDay = 24 * 60 * 60 * 1000;

//   //   let cur = new Date(firstPresent);
//   //   console.log("Current date is : " + cur);
//   //   let absRun = 0;
//   //   let totalDays = 0;
//   //   while (cur <= endDate) {
//   //     const ds = normalizeDateStr(cur);
//   //     const present = attendanceMap[ds] === undefined ? false : !!attendanceMap[ds];

//   //     if (!present) absRun += 1;
//   //     else absRun = 0;
//   //     console.log(`Date: ${ds}, Present: ${present}, AbsRun: ${absRun}`);



//   //     totalDays += 1; // count the day regardless of attendance (until break)
//   //     cur = new Date(cur.getTime() + oneDay);
//   //   }
//   //   console.log("Absent days count is : " + absRun);
//   //   console.log("Total days are : " + totalDays);
//   //   // if (absRun >= 4) {
//   //     totalDays = Math.max(0, totalDays - absRun);
//   //   // }

//   //   return totalDays;
//   // };
//   // Robust day-counter: looks at many possible shapes of attendance data
//   const countDaysForBill = (b, selectedM, selectedY) => {
//     const normalizeDateStr = (d) => {
//       if (!d) return null;
//       const dt = d instanceof Date ? d : new Date(d);
//       if (Number.isNaN(dt.getTime())) return null;
//       const yyyy = dt.getFullYear();
//       const mm = String(dt.getMonth() + 1).padStart(2, "0");
//       const dd = String(dt.getDate()).padStart(2, "0");
//       return `${yyyy}-${mm}-${dd}`;
//     };

//     const parseAttendanceMap = (att) => {
//       const map = {};
//       if (!att) return map;

//       if (typeof att === "string") {
//         const parts = att.split(/[\s,]+/).filter(Boolean);
//         for (const p of parts) {
//           const ds = normalizeDateStr(p);
//           if (ds) map[ds] = true;
//         }
//         return map;
//       }

//       if (Array.isArray(att)) {
//         for (const item of att) {
//           if (typeof item === "string") {
//             const ds = normalizeDateStr(item);
//             if (ds) map[ds] = true;
//           } else if (typeof item === "object" && item !== null) {
//             const dateVal = item.date || item.attendance_date || item.timestamp || item.day || item.date_time;
//             const presentFlag =
//               item.present ??
//               item.is_present ??
//               (item.status ? String(item.status).toLowerCase().startsWith("p") : undefined);
//             const ds = normalizeDateStr(dateVal);
//             if (ds) map[ds] = presentFlag === undefined ? true : !!presentFlag;
//           }
//         }
//         return map;
//       }

//       if (typeof att === "object") {
//         for (const [k, v] of Object.entries(att)) {
//           const ds = normalizeDateStr(k);
//           if (!ds) continue;
//           if (typeof v === "boolean") map[ds] = v;
//           else if (typeof v === "number") map[ds] = v !== 0;
//           else if (typeof v === "string") {
//             const vs = v.toLowerCase();
//             map[ds] = vs === "true" || vs === "present" || vs.startsWith("p");
//           } else map[ds] = Boolean(v);
//         }
//         return map;
//       }

//       return map;
//     };

//     // Merge possible attendance sources
//     let attendanceMap = {};
//     if (b.attendance_map) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendance_map) };
//     if (b.attendance) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendance) };
//     if (b.present_dates) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.present_dates) };
//     if (b.attendance_days) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendance_days) };
//     if (b.attendanceMap) attendanceMap = { ...attendanceMap, ...parseAttendanceMap(b.attendanceMap) };

//     const m = selectedM
//       ? Number(selectedM)
//       : b.month
//         ? Number(b.month)
//         : new Date().getMonth() + 1;
//     const y = selectedY ? Number(selectedY) : b.year ? Number(b.year) : new Date().getFullYear();
//     if (Number.isNaN(m) || Number.isNaN(y)) return 0;

//     const monthLastDay = new Date(y, m, 0).getDate();

//     // Detect freeze date
//     const freezeCandidates = ["freeze_date", "frozen_at", "frozen_on", "freeze_on", "frozen_date"];
//     let freezeDate = null;
//     for (const f of freezeCandidates) {
//       if (b[f]) {
//         const ds = normalizeDateStr(b[f]);
//         if (ds) {
//           const dt = new Date(ds);
//           if (dt.getFullYear() === y && dt.getMonth() + 1 === m) {
//             freezeDate = ds;
//             break;
//           }
//         }
//       }
//     }

//     // Find first present day in month
//     const presentDates = Object.keys(attendanceMap)
//       .filter(
//         (d) =>
//           attendanceMap[d] &&
//           new Date(d).getMonth() + 1 === m &&
//           new Date(d).getFullYear() === y
//       )
//       .sort();

//     console.log("User name is : " + (b.name || b.user_name || "unknown"));
//     console.log("Present dates are : " + presentDates);

//     if (presentDates.length === 0) return 0;
//     const firstPresent = new Date(presentDates[0]);
//     console.log("First present date is : " + firstPresent);

//     const endDate = freezeDate ? new Date(freezeDate) : new Date(y, m - 1, monthLastDay);
//     const oneDay = 24 * 60 * 60 * 1000;

//     let cur = new Date(firstPresent);
//     let absRun = 0;
//     let totalDays = 0;
//     let totalAbsentToSubtract = 0;

//     while (cur <= endDate) {
//       const ds = normalizeDateStr(cur);
//       const present = attendanceMap[ds] === undefined ? false : !!attendanceMap[ds];

//       if (!present) absRun += 1;
//       else {
//         if (absRun > 10) totalAbsentToSubtract += absRun;
//         absRun = 0;
//       }

//       totalDays += 1;
//       cur = new Date(cur.getTime() + oneDay);
//     }

//     // if month ends with a long absence streak
//     if (absRun > 10) totalAbsentToSubtract += absRun;

//     const billedDays = Math.max(0, totalDays - totalAbsentToSubtract);

//     console.log("Total days:", totalDays);
//     console.log("Long absence days (to subtract):", totalAbsentToSubtract);
//     console.log("Final billed days:", billedDays);

//     return billedDays;
//   };




//   const fetchBills = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       setLoading(true);
//       let url = "https://bite-track-mess-management-system-a.vercel.app/api/bills/fetch";
//       if (month && year) url += `?month=${month}&year=${year}`;

//       const res = await fetch(url,{
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         }
//       });
//       if (!res.ok) throw new Error("Failed to fetch bills");
//       const data = await res.json();

//       // determine the month/year context we'll use to count days
//       const mapped = (data || []).map((b) => {

//         // prefer UI-selected month/year, then bill.month/year, then null (count all)
//         const selM = month || b.month || null;
//         const selY = year || b.year || null;

//         const days = b.days_billed != null ? countDaysForBill(b, selM, selY) : countDaysForBill(b, selM, selY);
//         const per_day_rate = b.per_day_rate != null ? Number(b.per_day_rate) : Number(b.per_day_rate);
//         const total_amount = b.total_amount != null ? Number(b.total_amount) : days * per_day_rate;


//         // const days = countDaysForBill(b, selM, selY);
//         // const per_day_rate =  76.666666666666666666666666666667;
//         // const total_amount = Number(days) * per_day_rate;
//         return {
//           ...b,
//           days_billed: days,
//           per_day_rate,
//           total_amount,
//         };
//       });
//       setBills(mapped);
//     } catch (err) {
//       console.error("Error fetching bills:", err);
//       setBills([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleScan = async (qr) => {
//     try {
//       const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/mark", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ qr }),
//       });
//       const data = await res.json();

//       if (res.ok) {
//         setMessage(data.message || "Attendance marked successfully");

//         // fetch the names of recently marked users
//         const ids = qr.split("-").map((p) => Number(p)).filter(Boolean);
//         const namesRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/names", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ userIds: ids }),
//         });
//         const namesData = await namesRes.json();
//         setRecentUsers(namesData.names || []);
//       } else {
//         setMessage(data.error || "Failed to mark attendance");
//         setRecentUsers([]);
//       }

//     } catch (err) {
//       console.error("Error marking attendance:", err);
//       setMessage("Something went wrong");
//       setRecentUsers([]);
//     }
//   };

//   useEffect(() => {
//     fetchBills();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [month, year]);

//   const handleGenerateBills = async () => {
//     try {
//       const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bills/generate", { method: "POST" });
//       if (!res.ok) throw new Error("Failed to generate bills");
//       await fetchBills();
//       alert("Bills generated successfully");
//     } catch (err) {
//       console.error("Error generating bills:", err);
//     }
//   };

//   const handlePaidToggle = async (userId, month, year) => {
//     try {
//       const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bills/mark-paid", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId, month, year }),
//       });

//       if (!res.ok) throw new Error("Failed to update payment status");

//       const data = await res.json();
//       await fetchBills(); // Refresh data
//       alert(`Payment marked as ${data.paid ? "Paid" : "Unpaid"}`);
//     } catch (err) {
//       console.error("Error updating payment status:", err);
//     }
//   };



//   const handleFreezeToggle = async (bill) => {
//     if (bill.payment_status !== "Paid") {
//       alert("❌ Freeze option is only available for paid users.");
//       return;
//     }

//     try {
//       const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/users/freeze`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ user_id: bill.user_id }),
//       });
//       const data = await res.json();
//       if (res.ok) {
//         alert(`✅ ${data.status === "Frozen" ? "User frozen" : "User unfrozen"} successfully.`);
//         fetchBills(); // refresh
//       } else {
//         alert("Error toggling freeze: " + (data.error || "Unknown error"));
//       }
//     } catch (err) {
//       console.error("Freeze toggle error:", err);
//       alert("Something went wrong while freezing/unfreezing.");
//     }
//   };



//   const handleDownloadBill = (bill) => {
//     const titleMonth = month || bill.month || "";
//     const titleYear = year || bill.year || new Date().getFullYear();
//     const monthName = titleMonth ? new Date(0, Number(titleMonth) - 1).toLocaleString("default", { month: "long" }) : "";

//     const content = `Bill for ${bill.name || bill.user_name || "user"}\nMonth: ${monthName} ${titleYear}\nDays: ${bill.days_billed}\nRate: ${bill.per_day_rate}\nTotal: ${bill.total_amount}`;
//     const blob = new Blob([content], { type: "text/plain" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `${bill.name || "user"}_bill_${titleMonth}_${titleYear}.txt`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   // Filter + sort
//   const filteredBills = bills.filter((b) => {
//     const name = (b.user_name || b.name || "").toString();
//     const email = (b.email || "").toString();
//     return (
//       name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       email.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//   }).sort((a, b) => {
//     let fieldA = a[sortField] ?? "";
//     let fieldB = b[sortField] ?? "";

//     if (sortField === "name") {
//       fieldA = a.user_name || a.name || "";
//       fieldB = b.user_name || b.name || "";
//     }

//     // numeric sort if numbers
//     if (!isNaN(Number(fieldA)) && !isNaN(Number(fieldB))) {
//       return sortOrder === "asc" ? Number(fieldA) - Number(fieldB) : Number(fieldB) - Number(fieldA);
//     }

//     if (typeof fieldA === "string") fieldA = fieldA.toLowerCase();
//     if (typeof fieldB === "string") fieldB = fieldB.toLowerCase();

//     if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
//     if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
//     return 0;
//   });



//   useEffect(() => {
//   if (selectedAttendance) {
//     document.body.style.overflow = "hidden";
//   } else {
//     document.body.style.overflow = "auto";
//   }
// }, [selectedAttendance]);




//   return (
//     <Layout>
//       <div className={styles.container}>
//         <main className={styles.main}>
//           <h1 className={styles.title}>
//             Billing Records {month && year ? ` - ${new Date(0, month - 1).toLocaleString("default", { month: "long" })} ${year}` : ""}
//           </h1>
//           {/* {selectedAttendance && (
//             <div style={{ marginTop: "20px" }}>
//               <h3>{selectedAttendance.name}'s Attendance</h3>
//               <AttendanceCalendar
//                 year={selectedAttendance.year}
//                 month={selectedAttendance.month}
//                 attendanceMap={selectedAttendance.attendanceMap}
//               />
//               <button onClick={() => setSelectedAttendance(null)}>Close</button>
//             </div>
//           )} */}








//           {/* Filters */}
//           <div className={styles.filters}>
//             <div className={styles.filterCard}>
//               <label>Month</label>
//               <select value={month} onChange={(e) => setMonth(e.target.value)}>
//                 <option value="">All</option>
//                 {[...Array(12).keys()].map((m) => (
//                   <option key={m + 1} value={m + 1}>
//                     {new Date(0, m).toLocaleString("default", { month: "long" })}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className={styles.filterCard}>
//               <label>Year</label>
//               <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="YYYY" />
//             </div>

//             <button className={styles.generateButton} onClick={handleGenerateBills}>
//               Generate Bills for Current Month
//             </button>
//             <button
//               className={styles.generateButton}
//               onClick={() => {
//                 if (!month || !year) return alert("Please select month and year");
//                 window.open(`https://bite-track-mess-management-system-a.vercel.app/api/bills/download?month=${month}&year=${year}`, "_blank");
//               }}
//             >
//               Download Monthly Bills
//             </button>

//           </div>

//           {/* Search & Sort */}
//           <div className={styles.searchSort}>
//             <input type="text" placeholder="Search by user or email" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

//             <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
//               <option value="name">Sort by Name</option>
//               <option value="total_amount">Sort by Total</option>
//               <option value="days_billed">Sort by Days</option>
//             </select>

//             <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
//               <option value="asc">Ascending</option>
//               <option value="desc">Descending</option>
//             </select>
//           </div>


//           {/* Bills Table */}
//           {/* <section style={{ marginTop: "20px" }}>
//             {loading ? (
//               <div className={styles.loading}>Loading...</div>
//             ) : bills.length === 0 ? (
//               <div className={styles.empty}>No bills found</div>
//             ) : (
//               <div style={{ overflowX: "auto" }} className={styles.tableContainer} >
//                 <table className={styles.table}>
//                   <thead>
//                     <tr>
//                       <th>Sr. No.</th>
//                       <th>User</th>
//                       <th>Email</th>
//                       <th>Days Billed</th>
//                       <th>Rate</th>
//                       <th>Total</th>
//                       <th>Status</th>
//                       <th>Action</th>
//                       <th>Payment Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {filteredBills.map((b, idx) => {
//                       const status = b.status || "Active";
//                       return (
//                         <tr key={b.id ? b.id : `${b.user_id}-${b.year || 0}-${b.month || 0}`}>
//                           <td>{idx + 1}</td>
//                           <td>{b.name || b.user_name || "-"}</td>
//                           <td>{b.email || "-"}</td>
//                           <td>{b.days_billed ?? 0}</td>
//                           <td>{Number(b.per_day_rate ?? 0).toFixed(2)}</td>
//                           <td>{Number(b.total_amount ?? 0).toFixed(2)}</td>
//                           <td>{status}</td>
//                           <td>

//                             <button
//                               onClick={() => handleFreezeToggle(b.user_id, status)}
//                               style={{
//                                 backgroundColor: status === "Active" ? "red" : "green",
//                                 color: "white",
//                                 padding: "4px 8px",
//                                 border: "none",
//                                 borderRadius: "4px",
//                                 cursor: "pointer",
//                                 marginRight: "5px",
//                               }}
//                             >
//                               {status === "Active" ? "Freeze" : "Unfreeze"}
//                             </button>

//                             <button
//                               onClick={() => handlePaidToggle(b.user_id, b.month, b.year)}
//                               style={{
//                                 backgroundColor: b.paid ? "gray" : "blue",
//                                 color: "white",
//                                 padding: "4px 8px",
//                                 border: "none",
//                                 borderRadius: "4px",
//                                 cursor: "pointer",
//                               }}
//                             >
//                               {b.paid ? "Unmark Paid" : "Mark Paid"}
//                             </button>

//                             <button
//                               onClick={() =>
//                                 setSelectedAttendance({
//                                   year: b.year,
//                                   month: b.month,
//                                   attendanceMap: b.attendance_map,
//                                   name: b.name
//                                 })
//                               }
//                             >
//                               View Calendar
//                             </button>
//                           </td>
//                           <td>
//                             {b.paid ? (
//                               <span
//                                 style={{
//                                   backgroundColor: "green",
//                                   color: "white",
//                                   padding: "4px 8px",
//                                   borderRadius: "4px",
//                                 }}
//                               >
//                                 Paid
//                               </span>
//                             ) : (
//                               <span
//                                 style={{
//                                   backgroundColor: "red",
//                                   color: "white",
//                                   padding: "4px 8px",
//                                   borderRadius: "4px",
//                                 }}
//                               >
//                                 Unpaid
//                               </span>
//                             )}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>

//                 </table>

//               </div>
//             )}
//           </section> */}

//           {/* Bills Table */}
//           <section style={{ marginTop: "20px" }}>
//             {loading ? (
//               <div className={styles.loading}>Loading...</div>
//             ) : bills.length === 0 ? (
//               <div className={styles.empty}>No bills found</div>
//             ) : (
//               <div className={styles.tableWrapper}>
//                 <table className={styles.table}>
//                   <thead>
//                     <tr>
//                       {[
//                         "Sr. No.",
//                         "User",
//                         "Email",
//                         "Days Billed",
//                         "Rate",
//                         "Total",
//                         "Status",
//                         "Action",
//                         "Payment Status",
//                       ].map((col) => (
//                         <th
//                           key={col}
//                           onClick={() => {
//                             const fieldMap = {
//                               "User": "name",
//                               "Days Billed": "days_billed",
//                               "Rate": "per_day_rate",
//                               "Total": "total_amount"
//                             };
//                             if (fieldMap[col]) {
//                               if (sortField === fieldMap[col]) {
//                                 setSortOrder(sortOrder === "asc" ? "desc" : "asc");
//                               } else {
//                                 setSortField(fieldMap[col]);
//                                 setSortOrder("asc");
//                               }
//                             }
//                           }}
//                           style={{ cursor: ["User", "Days Billed", "Rate", "Total"].includes(col) ? "pointer" : "default" }}
//                         >
//                           {col} {sortField === col.toLowerCase().replace(" ", "_") ? (sortOrder === "asc" ? "▲" : "▼") : ""}
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {filteredBills.map((b, idx) => {
//                       const status = b.status || "Active";
//                       return (
//                         <tr key={b.id || `${b.user_id}-${b.year}-${b.month}`} className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
//                           <td>{idx + 1}</td>
//                           <td>{b.name || b.user_name || "-"}</td>
//                           <td>{b.email || "-"}</td>
//                           <td>{b.days_billed ?? 0}</td>
//                           <td>{Number(b.per_day_rate ?? 0).toFixed(2)}</td>
//                           <td>{Number(b.total_amount ?? 0).toFixed(2)}</td>
//                           <td>{status}</td>
//                           <td>
//                             {/* Freeze / Unfreeze Button */}
//                             <button
//                               className={`${styles.btn} ${status === "Active" ? styles.freeze : styles.unfreeze}`}
//                               onClick={() => {
//                                 if (!b.paid) {
//                                   alert("❌ You can freeze only after payment is marked as paid.");
//                                   return;
//                                 }
//                                 handleFreezeToggle(b.user_id, status);
//                               }}
//                               disabled={!b.paid}
//                               title={!b.paid ? "Freeze available only for paid users" : ""}
//                             >
//                               {status === "Active" ? "Freeze" : "Unfreeze"}
//                             </button>

//                             {/* Mark Paid / Unpaid Button */}
//                             <button
//                               className={`${styles.btn} ${b.paid ? styles.paidBtn : styles.unpaidBtn}`}
//                               onClick={() => handlePaidToggle(b.user_id, b.month, b.year)}
//                             >
//                               {b.paid ? "Unmark Paid" : "Mark Paid"}
//                             </button>

//                             {/* View Calendar Button */}
//                             <button
//                               className={styles.btn}
//                               onClick={() =>
//                                 setSelectedAttendance({
//                                   year: b.year,
//                                   month: b.month,
//                                   attendanceMap: b.attendance_map,
//                                   name: b.name,
//                                 })
//                               }
//                             >
//                               View Calendar
//                             </button>
//                           </td>

//                           <td>
//                             <span className={b.paid ? styles.paidBadge : styles.unpaidBadge}>
//                               {b.paid ? "Paid" : "Unpaid"}
//                             </span>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </section>

//         </main>


//       </div>
//       {selectedAttendance && (
//   <div className="modalOverlay">
//   <div className="modalContent">
//     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//       <h3>{selectedAttendance.name}'s Attendance</h3>
//       <button
//         onClick={() => setSelectedAttendance(null)}
//         style={{
//           background: "none",
//           border: "none",
//           fontSize: "1.4rem",
//           color: "#475569",
//           cursor: "pointer",
//         }}
//       >
//         ✕
//       </button>
//     </div>

//     <AttendanceCalendar
//       year={selectedAttendance.year}
//       month={selectedAttendance.month}
//       attendanceMap={selectedAttendance.attendanceMap}
//     />

//     <button onClick={() => setSelectedAttendance(null)} className="closeBtn">
//       Close
//     </button>
//   </div>
// </div>

// )}

//     </Layout>
//   );
// }
















// pages/billing.js
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AttendanceCalendar from "../components/AttedanceCalendar";
import styles from "../styles/billing.module.css";
import useAuth from "../hooks/useAuth";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

export default function BillsPage() {
  useAuth(); // keeps login redirect behavior

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // // Per-day rate option
  // const [perDayMode, setPerDayMode] = useState("mess"); // mess | optionA
  // const [optionARate, setOptionARate] = useState("76.67");
  const [freezeModal, setFreezeModal] = useState(null);

  // UI
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [confirmUnmark, setConfirmUnmark] = useState({
    show: false,
    bill: null,
  });

  const [paymentModal, setPaymentModal] = useState(null); // { bill } or null
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_type: "monthly",
    payment_method: "",
    upi_id: "",
    transaction_id: "",
    receipt_number: "",
    payment_date: new Date().toISOString().slice(0, 10),
  });

  const openPaymentModal = (bill) => {
    setPaymentData({
      amount: bill.total_amount ?? 0,
      payment_type: "monthly",
      payment_method: "",
      upi_id: "",
      transaction_id: "",
      receipt_number: `REC-${bill.user_id}-${bill.month}-${bill.year}-${Date.now()}`,
      payment_date: new Date().toISOString().slice(0, 10),
    });
    setPaymentModal(bill);
  };



  const [pdfBase64, setPdfBase64] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openModal = async () => {
    setIsOpen(true);
    const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bills/generate-receipt/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment: "abc",
        userName: "John Doe",
        prefixedUserId: "U-101",
        userEmail: "john@example.com",
        messName: "My Mess",
        stampImageUrl: "",
        signatureImageUrl: "",
      }),
    });
    const data = await res.json();
    setPdfBase64(data.pdf);
  };

  const closeModal = () => {
    setIsOpen(false);
    setPdfBase64(null);
  };

  const submitPayment = async () => {
    if (!paymentModal) return;

    if (!paymentData.amount || Number(paymentData.amount) <= 0)
      return toast.error("Enter a valid amount");

    if (!paymentData.payment_type) return toast("Select payment type");
    if (!paymentData.payment_method) return toast("Select payment method");

    const payload = {
      user_id: paymentModal.user_id,
      month: paymentModal.month,
      year: paymentModal.year, // current year
      amount: Number(paymentData.amount),
      payment_type: paymentData.payment_type,
      payment_method: paymentData.payment_method,
      upi_id: paymentData.upi_id || null,
      transaction_id: paymentData.transaction_id || null,
      payment_date: paymentData.payment_date,
      mess_id: paymentModal.mess_id,
    };

    try {
      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bills/mark-paid/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark payment");

      toast.success("Payment recorded successfully!");
      setPaymentModal(null);
      fetchBills();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  // Token
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeaders = () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

  // Helpers for start/end dates
  function todayLocalISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }


  // const computeStartDate = (b) => {
  //   return b.first_attendance_date ? new Date(b.first_attendance_date).toISOString().slice(0, 10)
  //     : b.date_of_joining ? new Date(b.date_of_joining).toISOString().slice(0, 10)
  //     : "";
  // };
  // const computeEndDate = (b) => {
  //   const today = todayISO();
  //   return b.paid ? (b.generated_at ? new Date(b.generated_at).toISOString().slice(0, 10) : today) : today;
  // };
  // const getPerDayRate = (b) => perDayMode === "optionA" ? Number(optionARate) || 0 : Number(b.per_day_rate ?? 0);

 const fetchBills = async () => {
  try {
    setLoading(true);

    const isFiltered = month && year;

    const cacheKey = isFiltered
      ? `bills-${month}-${year}`
      : `bills-all`;

    const url = isFiltered
      ? `https://bite-track-mess-management-system-a.vercel.app/api/bills/fetch?month=${month}&year=${year}`
      : `https://bite-track-mess-management-system-a.vercel.app/api/bills/all/`;

    const data = await offlineFetch(cacheKey, async () => {
      const res = await fetch(url, { headers: authHeaders() });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    });

    setBills(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("fetchBills error:", err);
    setBills([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchBills();
  }, [month, year]);


  // Actions
  const togglePaid = async (userId, billMonth, billYear) => {
    try {
      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bills/toggle-paid/", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId, month: billMonth, year: billYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle paid");
      await fetchBills();
      toast.success(`Payment status changed: ${data.paid ? "Paid" : "Unpaid"}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };
  // REPLACE existing toggleFreeze with this implementation
  const toggleFreeze = async (userId, action) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // if (!token) return alert("Not authenticated. Please login.");

      // action must be 'freeze' or 'unfreeze'
      if (!["freeze", "unfreeze"].includes(action)) {
        return toast.error("Something went wrong. Please try again.");
      }

      // UI optimistic lock: disable button by setting local in-flight marker (optional)
      // You can add state to track inFlight if you want.

      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bills/toggle-freeze/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, action }),
      });

      // try parse JSON safely (server sometimes returns HTML on unexpected errors)
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("Non-JSON response from toggle-freeze", parseErr);
        return toast.error("Something went wrong. Please try again.");
      }

      if (res.status === 401) {
        return toast.error("Unauthorized. Please login again.");
      }

      if (!res.ok) {
        // API returns { error: '...' }
        console.error("Toggle response:", data);
        toast.error("Something went wrong. Please try again.");
      }

      // success: server returns { ok: true, action: 'freeze'|'unfreeze', user: { ... } }
      console.log("Toggle response:", data);

      // Update local bills state so UI reflects new status immediately
      setBills((prev) =>
        prev.map((b) =>
          b.user_id === userId
            ? {
              ...b,
              // update status from returned user if present, else set according to action
              status: data.user?.status ?? (action === "freeze" ? "Inactive" : "Active"),
              freeze_date: data.user?.freeze_date ?? b.freeze_date,
              unfreeze_date: data.user?.unfreeze_date ?? b.unfreeze_date,
              // if action is freeze, keep paid unchanged; if unfreeze, nothing about paid
            }
            : b
        )
      );

      // show confirmation modal
      setFreezeModal({
        userId,
        action,
        message:
          action === "freeze"
            ? "User has been frozen. Billing will stop from freeze date and attendance after that date is cleared."
            : "User has been unfrozen. first_attendance_date set to today and billing resumes."
      });

      // optionally refresh data from server (keeps UI canonical)
      // await fetchBills();
    } catch (err) {
      console.error("Error in toggleFreeze:", err);
      toast.error("Something went wrong. Please try again.");
    }
  };



  const downloadMonthlyPDF = async () => {
    if (!month || !year) return toast("Please select month and year.");
    try {
      const token = localStorage.getItem("token"); // or from context

      const url = `https://bite-track-mess-management-system-a.vercel.app/api/bills/downloadPDF/?month=${month}&year=${year}`;

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

       if (isMobile) {
      // ✅ MOBILE: open PDF in new tab
      window.open(url + `&token=${token}`, "_blank");
      return;
    }
    
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,   // 🔥 REQUIRED
        },
      });

      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const filename = `bills_${month}_${year}.pdf`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // Filtered for UI
  const filtered = bills.filter((b) => {
    if (statusFilter !== "all") {
      if (statusFilter === "paid" && !b.paid) return false;
      if (statusFilter === "unpaid" && b.paid) return false;
    }
    if (!search) return true;
    return `${b.name || ""} ${b.email || ""}`.toLowerCase().includes(search.toLowerCase());
  });


  const downloadExcel = async () => {
    if (!month || !year) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    try {
      const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/bills/download/?month=${month}&year=${year}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        const error = await res.json();
        console.error("Excel download failed:", error);
        toast.error("Something went wrong. Please try again.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `billing_${year}_${month}.xlsx`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel download error:", err);
    }
  };

  const { t } = useLanguage();

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{t("billing")}</h1>

          {/* <button onClick={openModal}>Open Receipt</button> */}

          {isOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <button onClick={closeModal}>{t("close")}</button>
                {pdfBase64 && (
                  <iframe
                    src={`data:application/pdf;base64,${pdfBase64}`}
                    width="100%"
                    height="600px"
                  />
                )}
              </div>
            </div>
          )}

          <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          width: 80%;
          max-width: 900px;
        }
      `}</style>

          {/* Filters */}
          <div className={styles.controls}>
            <div className={styles.controlItem}>
              <label>{t("month")}</label>
              <select className={styles.dropdown} value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">{t("selectMonth")}</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const monthNum = (i + 1).toString().padStart(2, "0");
                  const monthName = new Date(0, i).toLocaleString("default", { month: "long" });
                  return <option key={monthNum} value={monthNum}>{monthName}</option>;
                })}
              </select>
            </div>

            <div className={styles.controlItem}>
              <label>{t("year")}</label>
              <input type="number" placeholder={t("yearPlaceholder")} value={year} onChange={(e) => setYear(e.target.value)} />
            </div>

            <div className={styles.controlItem}>
              <label>{t("payment")}</label>
              <select className={styles.dropdown} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">{t("all")}</option>
                <option value="paid">{t("paid")}</option>
                <option value="unpaid">{t("unpaid")}</option>
              </select>
            </div>

            <div className={styles.controlItem}>
              <label>{t("search")}</label>
              <input placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {/* 
            <div className={styles.controlItem}>
              <label>Per-day Rate</label>
              <div className={styles.rateRow}>
                <label><input type="radio" checked={perDayMode === "mess"} onChange={() => setPerDayMode("mess")} /> Mess</label>
                <label><input type="radio" checked={perDayMode === "optionA"} onChange={() => setPerDayMode("optionA")} /> Option A</label>
                {perDayMode === "optionA" && <input type="number" step="0.01" value={optionARate} onChange={(e) => setOptionARate(e.target.value)} />}
              </div>
            </div> */}

            <div className={styles.controlItemActions}>
              <button className={styles.btnPrimary} onClick={fetchBills}>{t("refresh")}</button>
              <button className={styles.btnSecondary} onClick={downloadMonthlyPDF} disabled={!month || !year}>{t("downloadMonthlyPdf")}</button>
              <button className={styles.btnSecondary} onClick={downloadExcel} disabled={!month || !year}>{t("downloadExcel")}</button>
            </div>
          </div>

          {/* Table */}
          <section style={{ marginTop: 20 }}>
            {loading ? (
              <div className={styles.loading}>{t("loading")}</div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>{t("noBillsFound")}</div>
            ) : (
              <>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("srNo")}</th>
                        <th>{t("user")}</th>
                        <th>{t("email")}</th>
                        <th>{t("status")}</th>
                        <th>{t("startDate")}</th>
                        <th>{t("endDate")}</th>
                        <th>{t("days")}</th>
                        <th>{t("perDayRate")}</th>
                        <th>{t("totalAmount")}</th>
                        <th>{t("paymentStatus")}</th>
                        <th>{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((b, idx) => (
                        <tr key={b.id || `${b.user_id}-${b.year}-${b.month}`}>
                          <td>{idx + 1}</td>
                          <td>{b.name || b.user_name || "-"}</td>
                          <td>{b.email || "-"}</td>
                          <td>{b.status || t("active")}</td>
                          <td>{b.start_date || "-"}</td>
                          <td>{b.end_date || "-"}</td>
                          <td>{b.days_billed}</td>
                          <td>{Number(b.chosen_per_day_rate).toFixed(2)}</td>
                          <td>{Number(b.total_amount).toFixed(2)}</td>
                          <td>{b.paid ? t("paid") : t("unpaid")}</td>
                          <td className={styles.actionsCell}>
                            <button
                              className={`${styles.btnAction} ${b.paid ? styles.btnPaidDisabled : styles.btnPaid}`}
                              disabled={b.paid}
                              onClick={() => {
                                if (!b.paid) openPaymentModal(b);  // only open modal if unpaid
                              }}
                            >
                              {b.paid ? t("paid") : t("markPaid")}
                            </button>

                            <button
                              className={`${styles.btnAction} ${b.status === "Active"
                                  ? b.paid
                                    ? styles.btnFreeze
                                    : styles.btnDisabled
                                  : styles.btnUnfreeze
                                }`}
                              disabled={b.status === "Active" && !b.paid}
                              onClick={() => {
                                if (b.status === "Active" && !b.paid) {
                                  return toast.error(t("somethingWentWrong"));
                                }
                                const action = b.status === "Active" ? "freeze" : "unfreeze";
                                toggleFreeze(b.user_id, action);
                              }}
                            >
                              {b.status === "Active" ? t("freeze") : t("unfreeze")}
                            </button>

                            <button className={`${styles.btnAction} ${styles.btnCalendar}`} onClick={() => setSelectedAttendance({ year: b.year, month: b.month, attendanceMap: b.attendance_map, name: b.name })}>
                              {t("viewCalendar")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* ================= MOBILE / ANDROID CARDS ================= */}
                <div className={styles.mobileList}>
                  {filtered.map((b, idx) => (
                    <div key={b.id || idx} className={styles.mobileCard}>
                      <div className={styles.cardRow}><span>{t("srNo")}</span><strong>{idx + 1}</strong></div>
                      <div className={styles.cardRow}><span>{t("user")}</span><strong>{b.name || "-"}</strong></div>
                      <div className={styles.cardRow}><span>{t("email")}</span><strong>{b.email || "-"}</strong></div>
                      <div className={styles.cardRow}><span>{t("status")}</span><strong>{b.status}</strong></div>
                      <div className={styles.cardRow}><span>{t("startDate")}</span><strong>{b.start_date || "-"}</strong></div>
                      <div className={styles.cardRow}><span>{t("endDate")}</span><strong>{b.end_date || "-"}</strong></div>
                      <div className={styles.cardRow}><span>{t("days")}</span><strong>{b.days_billed}</strong></div>
                      <div className={styles.cardRow}><span>{t("rate")}</span><strong>₹{Number(b.chosen_per_day_rate).toFixed(2)}</strong></div>
                      <div className={styles.cardRow}><span>{t("total")}</span><strong>₹{Number(b.total_amount).toFixed(2)}</strong></div>
                      <div className={styles.cardRow}><span>{t("payment")}</span><strong>{b.paid ? t("paid") : t("unpaid")}</strong></div>

                      {/* ACTION BUTTONS */}
                      <div className={styles.cardActions}>
                        <button
                          className={`${styles.btnAction} ${b.paid ? styles.btnPaidDisabled : styles.btnPaid}`}
                          disabled={b.paid}
                          onClick={() => !b.paid && openPaymentModal(b)}
                        >
                          {b.paid ? t("paid") : t("markPaid")}
                        </button>

                        <button
                          className={`${styles.btnAction} ${b.status === "Active"
                              ? b.paid
                                ? styles.btnFreeze
                                : styles.btnDisabled
                              : styles.btnUnfreeze
                            }`}
                          disabled={b.status === "Active" && !b.paid}
                          onClick={() => {
                            if (b.status === "Active" && !b.paid) {
                              return toast.error(t("somethingWentWrong"));
                            }
                            toggleFreeze(b.user_id, b.status === "Active" ? "freeze" : "unfreeze");
                          }}
                        >
                          {b.status === "Active" ? t("freeze") : t("unfreeze")}
                        </button>

                        <button
                          className={`${styles.btnAction} ${styles.btnCalendar}`}
                          onClick={() =>
                            setSelectedAttendance({
                              year: b.year,
                              month: b.month,
                              attendanceMap: b.attendance_map || {},
                              name: b.name,
                            })
                          }
                        >
                          {t("viewCalendar")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Payment Modal */}
          {paymentModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3>{t("markPayment")} — {paymentModal.name || paymentModal.user_name}</h3>

                <div className={styles.formGroup}>
                  <label>{t("amount")}</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>{t("paymentType")}</label>
                  <select
                    value={paymentData.payment_type}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_type: e.target.value })}
                  >
                    <option value="monthly">{t("monthly")}</option>
                    <option value="daily">{t("daily")}</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>{t("paymentMethod")}</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  >
                    <option value="">{t("selectMethod")}</option>
                    <option value="Cash">{t("cash")}</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                {paymentData.payment_method === "UPI" && (
                  <div className={styles.formGroup}>
                    <label>{t("upiId")}</label>
                    <input
                      type="text"
                      value={paymentData.upi_id}
                      onChange={(e) => setPaymentData({ ...paymentData, upi_id: e.target.value })}
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>{t("transactionId")}</label>
                  <input
                    type="text"
                    value={paymentData.transaction_id}
                    onChange={(e) => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>{t("paymentDate")}</label>
                  <input
                    type="date"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={submitPayment} // call API https://bite-track-mess-management-system-a.vercel.app/api/bills/mark-paid
                  >
                    {t("submit")}
                  </button>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setPaymentModal(null)}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {freezeModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "24px",
                  borderRadius: "12px",
                  minWidth: "320px",
                  textAlign: "center",
                }}
              >
                <h3>{freezeModal.action === "freeze" ? t("userFrozen") : t("userUnfrozen")}</h3>
                <p style={{ marginTop: 8 }}>{freezeModal.message}</p>

                {freezeModal.user && (
                  <div style={{ textAlign: "left", marginTop: 12 }}>
                    <strong>{freezeModal.user.name}</strong>
                    <div>{t("status")}: {freezeModal.user.status}</div>
                    {freezeModal.user.freeze_date && <div>{t("freezeDate")}: {new Date(freezeModal.user.freeze_date).toISOString().slice(0, 10)}</div>}
                    {freezeModal.user.unfreeze_date && <div>{t("unfreezeDate")}: {new Date(freezeModal.user.unfreeze_date).toISOString().slice(0, 10)}</div>}
                  </div>
                )}

                <button
                  style={{
                    marginTop: "16px",
                    background: "#2563EB",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                  }}
                  onClick={() => setFreezeModal(null)}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {confirmUnmark.show && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3>{t("unmarkPayment")}</h3>
                <p style={{ marginTop: 8 }}>
                  {t("unmarkPaymentConfirm")} <strong>{t("unmarkThisPayment")}</strong>?
                </p>

                <div className={styles.modalActions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={async () => {
                      await togglePaid(
                        confirmUnmark.bill.user_id,
                        confirmUnmark.bill.month,
                        confirmUnmark.bill.year
                      );
                      setConfirmUnmark({ show: false, bill: null });
                    }}
                  >
                    {t("yesUnmark")}
                  </button>

                  <button
                    className={styles.btnSecondary}
                    onClick={() => setConfirmUnmark({ show: false, bill: null })}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Modal */}
          {selectedAttendance && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h3>{selectedAttendance.name}{t("attendanceSuffix")}</h3>
                  <button className={styles.closeX} onClick={() => setSelectedAttendance(null)}>✕</button>
                </div>
                <AttendanceCalendar year={selectedAttendance.year} month={selectedAttendance.month} attendanceMap={selectedAttendance.attendanceMap} />
                <div style={{ textAlign: "right", marginTop: 12 }}>
                  <button className={styles.btnSecondary} onClick={() => setSelectedAttendance(null)}>{t("close")}</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );

}
