// pages/leave.js
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/leave.module.css";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState("requests");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveMembers, setLeaveMembers] = useState(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  const fetchData = async () => {
    setLoading(true);

    try {
      const token = getToken();
      if (!token) return console.warn(t("tokenMissing"));

      const data = await offlineFetch("leave-all-data", async () => {
        const [resRequests, resHistory, resMembers] = await Promise.all([
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/leave/requests/",
            { headers: authHeaders() }
          ),
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/leave/history/",
            { headers: authHeaders() }
          ),
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/leave/members/",
            { method: "GET", headers: authHeaders() }
          ),
        ]);

        if (!resRequests.ok) throw new Error(t("failedToFetchLeaveRequests"));
        if (!resHistory.ok) throw new Error(t("failedToFetchLeaveHistory"));
        if (!resMembers.ok) throw new Error(t("failedToFetchLeaveMembers"));

        const membersData = await resMembers.json();

        return {
          requests: await resRequests.json(),
          history: await resHistory.json(),
          members: membersData,
        };
      });

      setLeaveRequests(Array.isArray(data.requests) ? data.requests : []);
      setLeaveHistory(Array.isArray(data.history) ? data.history : []);
      setLeaveMembers(
        Array.isArray(data.members.approved_members)
          ? data.members.approved_members
          : []
      );
    } catch (err) {
      console.error(t("fetchDataError"), err);
      setLeaveRequests([]);
      setLeaveHistory([]);
      setLeaveMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Layout>
      <div className={styles.container}>
         <main className={styles.main}>
          
        <h1 className={styles.title}>{t("leaveManagement")}</h1>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "requests" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("requests")}
          >
            {t("leaveRequests")}
          </button>

          <button
            className={`${styles.tabBtn} ${
              activeTab === "members" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("members")}
          >
            {t("leaveMembers")}
          </button>

          <button
            className={`${styles.tabBtn} ${
              activeTab === "history" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("history")}
          >
            {t("leaveHistory")}
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <p>{t("loading")}</p>
          ) : activeTab === "requests" ? (
            <LeaveTable data={leaveRequests} type="requests" refresh={fetchData} />
          ) : activeTab === "history" ? (
            <LeaveTable data={leaveHistory} type="history" refresh={fetchData} />
          ) : (
            <LeaveMembers data={leaveMembers} />
          )}
        </div>
         </main>
      </div>
      
    </Layout>
  );
}

/* ========================== */
/* ===== REQUESTS / HISTORY ===== */
/* ========================== */

function LeaveTable({ data, type, refresh }) {
  const { t } = useLanguage();

  if (!data?.length)
    return <p className={styles.emptyState}>{t("noRecordsFound")}</p>;

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/leave/update-status/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id, action }),
        }
      );

      const result = await res.json();
      if (!res.ok) return toast.error(t("somethingWentWrong"));

      refresh();
    } catch {
      toast.error(t("somethingWentWrong"));
    }
  };

  return (
    <>
      {/* DESKTOP TABLE */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("name")}</th>
            <th>{t("email")}</th>
            <th>{t("contact")}</th>
            <th>{t("hostel")}</th>
            <th>{t("from")}</th>
            <th>{t("to")}</th>
            {type === "requests" && <th>{t("actions")}</th>}
            {type === "history" && <th>{t("status")}</th>}
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td>{item.user_name}</td>
              <td>{item.email || item.user_email}</td>
              <td>{item.contact_no}</td>
              <td>{item.hostel_name}</td>
              <td>{formatDate(item.from_date)}</td>
              <td>{formatDate(item.to_date)}</td>

              {type === "requests" && (
                <td>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleAction(item.id, "Approved")}
                  >
                    {t("approve")}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleAction(item.id, "Rejected")}
                  >
                    {t("reject")}
                  </button>
                </td>
              )}

              {type === "history" && (
                <td>
                  <span
                    className={
                      item.status === "Approved"
                        ? styles.approved
                        : item.status === "Rejected"
                        ? styles.rejected
                        : styles.pending
                    }
                  >
                    {item.status === "Approved"
                      ? t("approved")
                      : item.status === "Rejected"
                      ? t("rejected")
                      : t("pending")}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* MOBILE STACKED CARDS */}
      <div className={styles.mobileList}>
        {data.map((item) => (
          <div key={item.id} className={styles.mobileCard}>
            <p><span className={styles.header}>{t("name")}:</span> {item.user_name}</p>
            <p><span className={styles.header}>{t("email")}:</span> {item.email || item.user_email}</p>
            <p><span className={styles.header}>{t("contact")}:</span> {item.contact_no}</p>
            <p><span className={styles.header}>{t("hostel")}:</span> {item.hostel_name}</p>
            <p><span className={styles.header}>{t("from")}:</span> {formatDate(item.from_date)}</p>
            <p><span className={styles.header}>{t("to")}:</span> {formatDate(item.to_date)}</p>

            {type === "requests" && (
              <div className={styles.mobileActions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleAction(item.id, "Approved")}
                >
                  {t("approve")}
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => handleAction(item.id, "Rejected")}
                >
                  {t("reject")}
                </button>
              </div>
            )}

            {type === "history" && (
              <span
                className={
                  item.status === "Approved"
                    ? styles.approved
                    : item.status === "Rejected"
                    ? styles.rejected
                    : styles.pending
                }
              >
                {item.status === "Approved"
                  ? t("approved")
                  : item.status === "Rejected"
                  ? t("rejected")
                  : t("pending")}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ========================== */
/* ===== LEAVE MEMBERS ===== */
/* ========================== */

function LeaveMembers({ data }) {
  const { t } = useLanguage();

  if (!data) return <p>{t("loading")}</p>;

  const approved_members = data;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

  if (approved_members.length === 0) {
    return <p className={styles.emptyState}>{t("noApprovedLeaveMembers")}</p>;
  }

  return (
    <>
      <div className={styles.mobileList}>
        {approved_members.map((item) => (
          <div key={item.id} className={styles.mobileCard}>
            <p><strong>{t("name")}:</strong> {item.user_name}</p>
            <p><strong>{t("email")}:</strong> {item.user_email}</p>
            <p><strong>{t("contact")}:</strong> {item.phone}</p>
            <p><strong>{t("from")}:</strong> {formatDate(item.from_date)}</p>
            <p><strong>{t("to")}:</strong> {formatDate(item.to_date)}</p>
          </div>
        ))}
      </div>
    </>
  );
}




      {/* <h2 className={styles.subTitle}>Excess Absent Members</h2>

      <div className={styles.mobileList}>
        {excess_absent_members.map((item) => (
          <div key={item.user_id} className={styles.mobileCard}>
            <p><strong>Name:</strong> {item.user_name}</p>
            <p><strong>Email:</strong> {item.user_email}</p>
            <p><strong>Contact:</strong> {item.phone}</p>
            <p><strong>Absent Days:</strong> {item.absent_count}</p>
            <p><strong>From:</strong> {formatDate(item.start_date)}</p>
            <p><strong>To:</strong> {formatDate(item.end_date)}</p>
          </div>
        ))}
      </div> */}
//     </>
//   );
// }



// //pages/leave.js
// import { useState, useEffect } from "react";
// import Layout from "../components/Layout";
// import styles from "../styles/leave.module.css";

// export default function LeaveManagement() {
//   const [activeTab, setActiveTab] = useState("requests");
//   const [leaveRequests, setLeaveRequests] = useState([]);
//   const [leaveHistory, setLeaveHistory] = useState([]);
//   const [leaveMembers, setLeaveMembers] = useState([]);

//   const [loading, setLoading] = useState(false);

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       // const resRequests = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/leave/requests/");
//       // const resHistory = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/leave/history/");
//       const token = localStorage.getItem("token");

// const resRequests = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/leave/requests/", {
//   headers: { Authorization: `Bearer ${token}` }
// });
// const resHistory = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/leave/history/", {
//   headers: { Authorization: `Bearer ${token}` }
// });
// const resMembers = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/leave/members/", {
//   headers: { Authorization: `Bearer ${token}` }
// });

// const membersData = await resMembers.json();

// setLeaveMembers(membersData); // contains two lists


//       setLeaveRequests(await resRequests.json());
//       setLeaveHistory(await resHistory.json());
//     } catch (err) {
//       console.error("Error fetching leave data:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <h1 className={styles.title}>🏖 Leave Management</h1>

//         {/* Tabs */}
//         <div className={styles.tabs}>
//           <button
//             className={`${styles.tabBtn} ${activeTab === "requests" ? styles.active : ""}`}
//             onClick={() => setActiveTab("requests")}
//           >
//             Leave Requests
//           </button>
//           <button
//             className={`${styles.tabBtn} ${activeTab === "members" ? styles.active : ""}`}
//             onClick={() => setActiveTab("members")}
//           >
//             Leave Members
//           </button>
//           <button
//             className={`${styles.tabBtn} ${activeTab === "history" ? styles.active : ""}`}
//             onClick={() => setActiveTab("history")}
//           >
//             Leave History
//           </button>
//         </div>

//         {/* Table Container */}
//         <div className={styles.tableContainer}>
//           {loading ? (
//             <p>Loading...</p>
//           ) : activeTab === "requests" ? (
//             <LeaveTable data={leaveRequests} type="requests" refresh={fetchData} />
//           ) : activeTab === "history" ? (
//             <LeaveTable data={leaveHistory} type="history" refresh={fetchData} />
//           ) : (
//             <LeaveMembers data={leaveMembers} />

//           )}
//         </div>
//       </div>
//     </Layout>
//   );
// }

// function LeaveTable({ data, type, refresh }) {
//   if (!data?.length) return <p className={styles.emptyState}>No records found.</p>;

//   const handleAction = async (id, action) => {
//     try {
//       const token = localStorage.getItem("token");

//       const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/leave/update-status/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ id, action }),
//       });

//       const result = await res.json();

//       if (!res.ok) {
//         alert(result.message || "Failed to update status");
//         return;
//       }

//       alert(result.message);
//       refresh();
//     } catch (error) {
//       console.error("Error:", error);
//       alert("Something went wrong");
//     }
//   };

//   return (
//     <table className={styles.table}>
//       <thead>
//         <tr>
//           <th>Name</th>
//           <th>Email</th>
//           <th>Contact</th>
//           <th>Hostel</th>
//           <th>From</th>
//           <th>To</th>

//           {type === "requests" && <th>Actions</th>}
//           {type === "history" && <th>Status</th>}
//         </tr>
//       </thead>

//       <tbody>
//         {data.map((item) => (
//           <tr key={item.id}>
//             <td>{item.user_name}</td>
//             <td>{item.email || item.user_email}</td>
//             <td>{item.contact_no}</td>
//             <td>{item.hostel_name}</td>
//             <td>{item.from_date}</td>
//             <td>{item.to_date}</td>

//             {/* ACTION BUTTONS FOR REQUESTS */}
//             {type === "requests" && (
//               <td>
//                 <button
//                   className={styles.approveBtn}
//                   onClick={() => handleAction(item.id, "Approved")}
//                 >
//                   Approve
//                 </button>

//                 <button
//                   className={styles.rejectBtn}
//                   onClick={() => handleAction(item.id, "Rejected")}
//                 >
//                   Reject
//                 </button>
//               </td>
//             )}

//             {/* STATUS COLOR FOR HISTORY */}
//             {type === "history" && (
//               <td>
//                 <span
//                   className={
//                     item.status === "Approved"
//                       ? styles.approved
//                       : item.status === "Rejected"
//                       ? styles.rejected
//                       : styles.pending
//                   }
//                 >
//                   {item.status}
//                 </span>
//               </td>
//             )}
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// }
// function LeaveMembers({ data }) {
//   if (!data) return <p>Loading...</p>;

//   const { approved_members = [], excess_absent_members = [] } = data;

//   const formatDate = (d) => {
//     if (!d) return "-";
//     return new Date(d).toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//     });
//   };

//   return (
//     <div>

//       {/* APPROVED LEAVE MEMBERS */}
//       <h2 className={styles.subTitle}>Approved Leave Members</h2>

// {approved_members.length === 0 ? (
//   <p className={styles.emptyState}>No approved leave members.</p>
// ) : (
//   <div className={styles.tableWrapper}>
//     <table className={`${styles.tables} ${styles.stickyTable}`}>
//       <thead>
//         <tr>
//           <th>Name</th>
//           <th>Email</th>
//           <th>Contact</th>
//           <th>Hostel</th>
//           <th>From</th>
//           <th>To</th>
//         </tr>
//       </thead>
//       <tbody>
//         {approved_members.map((item) => (
//           <tr key={item.id}>
//             <td>{item.user_name}</td>
//             <td>{item.user_email}</td>
//             <td>{item.phone}</td>
//             <td>{item.hostel_name}</td>
//             <td>{formatDate(item.from_date)}</td>
//             <td>{formatDate(item.to_date)}</td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   </div>
// )}


//       {/* EXCESS ABSENT MEMBERS */}
//       <h2 className={styles.subTitle} style={{ marginTop: "30px" }}>
//   Excess Absent Members
// </h2>

// {excess_absent_members.length === 0 ? (
//   <p className={styles.emptyState}>No members exceeded absence limit.</p>
// ) : (
//   <div className={styles.tableWrapper}>
//     <table className={`${styles.table} ${styles.stickyTable}`}>
//       <thead>
//         <tr>
//           <th>Name</th>
//           <th>Email</th>
//           <th>Contact</th>
//           <th>Absent Days</th>
//           <th>Absent From</th>
//           <th>Absent To</th>
//         </tr>
//       </thead>
//       <tbody>
//         {excess_absent_members.map((item) => (
//           <tr key={item.user_id}>
//             <td>{item.user_name}</td>
//             <td>{item.user_email}</td>
//             <td>{item.phone}</td>
//             <td>
//               <span className={styles.rejected}>
//                 {item.absent_count} Days
//               </span>
//             </td>
//             <td>{formatDate(item.start_date)}</td>
//             <td>{formatDate(item.end_date)}</td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   </div>
// )}

//     </div>
//   );
// }
