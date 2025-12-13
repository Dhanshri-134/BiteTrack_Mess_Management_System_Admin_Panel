
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
//         ? "/api/cash-payments/fetch"
//         : "/api/daily-payments/fetch";

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
//         ? "/api/cash-payments/update"
//         : "/api/daily-payments/update";

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

export default function CashPaymentsPage() {
  const [activeTab, setActiveTab] = useState("cash"); // cash | daily | verify
  const [payments, setPayments] = useState([]);

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

  const fetchData = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const url =
      activeTab === "cash"
        ? "/api/cash-payments/fetch"
        : activeTab === "daily"
        ? "/api/daily-payments/fetch"
        : "/api/payment-verifications/fetch";

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error("Invalid response:", data);
          setPayments([]);
        } else {
          setPayments(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAction = async (id, status) => {
    const processed_by = "Admin";

    const url =
      activeTab === "cash"
        ? "/api/cash-payments/update"
        : activeTab === "daily"
        ? "/api/daily-payments/update"
        : "/api/payment-verifications/update";

    await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, verification_status: status, verified_by: processed_by }),
    });

    setPayments((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, verification_status: status, verified_by: processed_by } : p
      )
    );
  };

  const statusBadge = (status) => {
    switch (status) {
      case "approved":
      case "Approved":
        return <span className={`${styles.badge} ${styles.approved}`}>Approved</span>;
      case "rejected":
      case "Rejected":
        return <span className={`${styles.badge} ${styles.rejected}`}>Rejected</span>;
      default:
        return <span className={`${styles.badge} ${styles.pending}`}>Pending</span>;
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>💰 Payment Requests</h1>

        {/* ---------------- TAB SWITCHER ---------------- */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "cash" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("cash")}
          >
            Cash Payment Requests
          </button>

          <button
            className={`${styles.tab} ${activeTab === "daily" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            Daily Payment Requests
          </button>

          <button
            className={`${styles.tab} ${activeTab === "verify" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("verify")}
          >
            Verify Payments
          </button>
        </div>

        {/* ---------------- TABLE ---------------- */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Amount</th>

                {activeTab === "cash" && <th>Month</th>}
                {activeTab === "cash" && <th>Year</th>}

                {activeTab === "verify" && <th>Payment Type</th>}
                {activeTab === "verify" && <th>Billing Start</th>}
                {activeTab === "verify" && <th>Billing End</th>}

                <th>Leave Days</th>
                <th>Status</th>
                <th>Requested At</th>
                {activeTab === "verify" && <th>Screenshot</th>}
                {activeTab === "verify" && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="12" className={styles.empty}>
                    No {activeTab === "cash" ? "cash" : activeTab === "daily" ? "daily" : "verification"} requests found
                  </td>
                </tr>
              ) : (
                payments.map((p, i) => (
                  <tr key={p.id}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{p.user_name}</strong>
                      <div className={styles.email}>{p.email}</div>
                    </td>

                    <td>₹{p.amount}</td>

                    {activeTab === "cash" && <td>{p.month}</td>}
                    {activeTab === "cash" && <td>{p.year}</td>}

                    {activeTab === "verify" && <td>{p.payment_type}</td>}
                    {activeTab === "verify" && <td>{p.billing_start_date || "-"}</td>}
                    {activeTab === "verify" && <td>{p.billing_end_date || "-"}</td>}

                    <td>{p.leave_days || 0}</td>
                    <td>{statusBadge(p.request_status || p.verification_status)}</td>
                    <td>{new Date(p.submitted_at || p.requested_at).toLocaleDateString()}</td>
                    {activeTab === "verify" && (
  <td>
    {p.screenshot_url && (
  <img
    src={p.screenshot_url}
    alt="Payment Proof"
    className={styles.thumbnail}
    onClick={() => openModal(p.screenshot_url)}
    style={{ cursor: "pointer", maxWidth: "80px", borderRadius: "4px" }}
  />
)}

  </td>
)}


                    {activeTab === "verify" && (
                      <td>
                        {p.verification_status === "pending" ? (
                          <div className={styles.actions}>
                            <button
                              onClick={() => handleAction(p.id, "approved")}
                              className={styles.approveBtn}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(p.id, "rejected")}
                              className={styles.rejectBtn}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className={styles.processed}>Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {modalOpen && (
  <div className={styles.modalOverlay} onClick={closeModal}>
    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
      <img src={modalImage} alt="Payment Proof" className={styles.modalImage} />
      <button className={styles.closeBtn} onClick={closeModal}>×</button>
    </div>
  </div>
)}

        </div>
      </div>
    </Layout>
  );
}
