
// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import styles from "../styles/table.module.css";

// export default function CashPaymentsPage() {
//   const [activeTab, setActiveTab] = useState("cash"); // cash | daily
//   const [payments, setPayments] = useState([]);

//   const fetchData = () => {
//     const token = localStorage.getItem("token");
//     if (!token) return;

//     const url =
//       activeTab === "cash"
//         ? "https://bite-track-mess-management-system-a.vercel.app/api/cash-payments/fetch"
//         : "https://bite-track-mess-management-system-a.vercel.app/api/daily-payments/fetch";

//     fetch(url, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     })
//       .then((res) => res.json())
//       .then((data) => {
//   if (!Array.isArray(data)) {
//     console.error("Invalid response:", data);
//     setPayments([]);     // 👈 prevent crash
//   } else {
//     setPayments(data);
//   }
// })

//       .catch(console.error);
//   };

//   useEffect(() => {
//     fetchData();
//   }, [activeTab]); // fetch when TAB changes

//   const handleAction = async (id, status) => {
//     const processed_by = "Admin";

//     const url =
//       activeTab === "cash"
//         ? "https://bite-track-mess-management-system-a.vercel.app/api/cash-payments/update"
//         : "https://bite-track-mess-management-system-a.vercel.app/api/daily-payments/update";

//     await fetch(url, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ id, status, processed_by }),
//     });

//     setPayments((prev) =>
//       prev.map((p) =>
//         p.id === id ? { ...p, request_status: status, processed_by } : p
//       )
//     );
//   };

//   const statusBadge = (status) => {
//     switch (status) {
//       case "Approved":
//         return <span className={`${styles.badge} ${styles.approved}`}>Approved</span>;
//       case "Rejected":
//         return <span className={`${styles.badge} ${styles.rejected}`}>Rejected</span>;
//       default:
//         return <span className={`${styles.badge} ${styles.pending}`}>Pending</span>;
//     }
//   };

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <h1 className={styles.title}>💰 Payment Requests</h1>

//         {/* ---------------- TAB SWITCHER ---------------- */}
//         <div className={styles.tabs}>
//           <button
//             className={`${styles.tab} ${activeTab === "cash" ? styles.activeTab : ""}`}
//             onClick={() => setActiveTab("cash")}
//           >
//             Cash Payment Requests
//           </button>

//           <button
//             className={`${styles.tab} ${activeTab === "daily" ? styles.activeTab : ""}`}
//             onClick={() => setActiveTab("daily")}
//           >
//             Daily Payment Requests
//           </button>
//         </div>

//         {/* ---------------- TABLE ---------------- */}
//         <div className={styles.tableContainer}>
//           <table className={styles.table}>
//             <thead>
//               <tr>
//                 <th>#</th>
//                 <th>User</th>
//                 <th>Amount</th>
//                 {activeTab === "cash" && <th>Month</th>}
//                 {activeTab === "cash" && <th>Year</th>}
//                 <th>Leave Days</th>
//                 <th>Status</th>
//                 <th>Requested At</th>
//                 <th>Action</th>
//               </tr>
//             </thead>

//             <tbody>
//               {payments.length === 0 ? (
//                 <tr>
//                   <td colSpan="10" className={styles.empty}>
//                     No {activeTab === "cash" ? "cash" : "daily"} payment requests found
//                   </td>
//                 </tr>
//               ) : (
//                 payments.map((p, i) => (
//                   <tr key={p.id}>
//                     <td>{i + 1}</td>
//                     <td>
//                       <strong>{p.user_name}</strong>
//                       <div className={styles.email}>{p.email}</div>
//                     </td>

//                     <td>₹{p.amount}</td>

//                     {/* Only for cash payment */}
//                     {activeTab === "cash" && <td>{p.month}</td>}
//                     {activeTab === "cash" && <td>{p.year}</td>}

//                     <td>{p.leave_days || 0}</td>
//                     <td>{statusBadge(p.request_status)}</td>
//                     <td>{new Date(p.requested_at).toLocaleDateString()}</td>

//                     <td>
//                       {p.request_status === "Pending" ? (
//                         <div className={styles.actions}>
//                           <button
//                             onClick={() => handleAction(p.id, "Approved")}
//                             className={styles.approveBtn}
//                           >
//                             Approve
//                           </button>
//                           <button
//                             onClick={() => handleAction(p.id, "Rejected")}
//                             className={styles.rejectBtn}
//                           >
//                             Reject
//                           </button>
//                         </div>
//                       ) : (
//                         <span className={styles.processed}>Processed</span>
//                       )}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </Layout>
//   );
// }


import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/table.module.css";
import { offlineFetch } from "@/lib/offlineFetch"; // make sure this exists
import { useLanguage } from "../context/LanguageContext";
import { Tooltip } from "recharts";

export default function CashPaymentsPage() {
  const [activeTab, setActiveTab] = useState("cash"); // cash | daily | verify
  const [payments, setPayments] = useState([]);
  const { t } = useLanguage();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  const openModal = (url) => {
    setModalImage(url);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImage(null);
  };

  const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("all");


  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const url =
        activeTab === "cash"
          ? "https://bite-track-mess-management-system-a.vercel.app/api/cash-payments/fetch/"
          : activeTab === "daily"
            ? "https://bite-track-mess-management-system-a.vercel.app/api/daily-payments/fetch/"
            : "https://bite-track-mess-management-system-a.vercel.app/api/payment-verifications/fetch/";

      const data = await offlineFetch(
        `payments-${activeTab}`, // 🔑 cache per tab
        async () => {
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            const err = await res.text();
            throw new Error(err || t("failedToFetchPayments"));
          }

          return res.json();
        }
      );

      if (!Array.isArray(data)) {
        console.error(t("invalidResponse"), data);
        setPayments([]);
      } else {
        setPayments(data);
      }
    } catch (err) {
      console.error(t("paymentsFetchError"), err);
      setPayments([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAction = async (id, status) => {
    const processed_by = "Admin";

    const url =
      activeTab === "cash"
        ? "https://bite-track-mess-management-system-a.vercel.app/api/cash-payments/update/"
        : activeTab === "daily"
          ? "https://bite-track-mess-management-system-a.vercel.app/api/daily-payments/update/"
          : "https://bite-track-mess-management-system-a.vercel.app/api/payment-verifications/update/";

    const body =
      activeTab === "verify"
        ? {
            id,
            verification_status: status,
            verified_by: processed_by,
          }
        : {
            id,
            status,
            processed_by,
          };

    const token = localStorage.getItem("token");

    await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? activeTab === "verify"
            ? { ...p, verification_status: status, verified_by: processed_by }
            : { ...p, request_status: status, processed_by }
          : p
      )
    );
  };

  const statusBadge = (status) => {
    switch (status) {
      case "approved":
      case "Approved":
        return <span className={`${styles.badge} ${styles.approved}`}>{t("approved")}</span>;
      case "rejected":
      case "Rejected":
        return <span className={`${styles.badge} ${styles.rejected}`}>{t("rejected")}</span>;
      default:
        return <span className={`${styles.badge} ${styles.pending}`}>{t("pending")}</span>;
    }
  };

  const filteredPayments = payments.filter((p) => {
  const text = `${p.user_name} ${p.email}`.toLowerCase();

  if (search && !text.includes(search.toLowerCase())) return false;

  const status = (p.request_status || p.verification_status || "").toLowerCase();
  if (statusFilter !== "all" && status !== statusFilter) return false;

  return true;
});


  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("paymentRequests")}</h1>

        {/* ---------------- TAB SWITCHER ---------------- */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "cash" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("cash")}
          >
            {t("cashPaymentRequests")}
          </button>

          <button
            className={`${styles.tab} ${activeTab === "daily" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            {t("dailyPaymentRequests")}
          </button>

          <button
            className={`${styles.tab} ${activeTab === "verify" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("verify")}
          >
            {t("verifyPayments")}
          </button>
        </div>
        <div className={styles.filterBar}>
  <input
    type="text"
    placeholder={t("search")}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className={styles.searchInput}
  />

  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className={styles.statusSelect}
  >
    <option value="all">{t("allStatus")}</option>
    <option value="pending">{t("pending")}</option>
    <option value="approved">{t("approved")}</option>
    <option value="rejected">{t("rejected")}</option>
  </select>
</div>


        {/* ---------------- TABLE ---------------- */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("user")}</th>
                <th>{t("amount")}</th>

                {activeTab === "cash" && <th>{t("month")}</th>}
                {activeTab === "cash" && <th>{t("year")}</th>}

                {activeTab === "verify" && <th>{t("paymentType")}</th>}
                {activeTab === "verify" && <th>{t("billingStart")}</th>}
                {activeTab === "verify" && <th>{t("billingEnd")}</th>}

                <th>{t("leaveDays")}</th>
                <th>{t("status")}</th>
                <th>{t("requestedAt")}</th>
                {activeTab === "verify" && <th>{t("screenshot")}</th>}
                <th>{t("action")}</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="12" className={styles.empty}>
                    {t("noRequestsFound", {
                      type:
                        activeTab === "cash"
                          ? t("cash")
                          : activeTab === "daily"
                            ? t("daily")
                            : t("verification"),
                    })}
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>
  <div className={styles.userInfo}>
    <strong>{p.user_name}</strong>
    <div className={styles.email}>{p.email}</div>
  </div>
</td>


                    <td>₹{Number(p.amount).toFixed(2)}</td>

                    {activeTab === "cash" && <td>{p.month}</td>}
                    {activeTab === "cash" && <td>{p.year}</td>}

                    {activeTab === "verify" && <td>{p.payment_type}</td>}
                    {activeTab === "verify" && <td>{p.billing_start_date || "-"}</td>}
                    {activeTab === "verify" && <td>{p.billing_end_date || "-"}</td>}

                    <td>{p.leave_days || 0}</td>
                    <td>{statusBadge(p.request_status || p.verification_status)}</td>
                    <td> At:{new Date(p.submitted_at || p.requested_at).toLocaleDateString()}</td>

                    {activeTab === "verify" && (
                      <td>
                        {p.screenshot_url && (
                          <img
                            src={p.screenshot_url}
                            alt={t("paymentProof")}
                            className={styles.thumbnail}
                            onClick={() => openModal(p.screenshot_url)}
                          />
                        )}
                      </td>
                    )}

                    <td>
                      {/* VERIFY TAB */}
                      {activeTab === "verify" &&
                        (p.verification_status === "pending" ? (
                          <div className={styles.actions}>
                            <button
                              onClick={() => handleAction(p.id, "approved")}
                              className={styles.approveBtn}
                            >
                              {t("approve")}
                            </button>
                            <button
                              onClick={() => handleAction(p.id, "rejected")}
                              className={styles.rejectBtn}
                            >
                              {t("reject")}
                            </button>
                          </div>
                        ) : (
                          <span className={styles.processed}>{t("processed")}</span>
                        ))}

                      {/* CASH & DAILY TABS */}
                      {(activeTab === "cash" || activeTab === "daily") &&
                        (p.request_status === "Pending" ? (
                          <div className={styles.actions}>
                            <button
                              onClick={() => handleAction(p.id, "Approved")}
                              className={styles.approveBtn}
                            >
                              {t("approve")}
                            </button>
                            <button
                              onClick={() => handleAction(p.id, "Rejected")}
                              className={styles.rejectBtn}
                            >
                              {t("reject")}
                            </button>
                          </div>
                        ) : (
                          <span className={styles.processed}>{t("processed")}</span>
                        ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {modalOpen && (
            <div className={styles.modalOverlay} onClick={closeModal}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <img src={modalImage} alt={t("paymentProof")} className={styles.modalImage} />
                <button className={styles.closeBtn} onClick={closeModal}>×</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
