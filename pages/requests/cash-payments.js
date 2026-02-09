

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/table.module.css";
import { offlineFetch } from "@/lib/offlineFetch"; // make sure this exists
import { useLanguage } from "../../context/LanguageContext";
import { Tooltip } from "recharts";
import toast from "react-hot-toast";
import DayDropdown from "../../components/DayDropdown";

import { ChevronDown, ChevronUp } from "lucide-react";

export default function CashPaymentsPage() {
  const [activeTab, setActiveTab] = useState("cash"); // cash | daily | verify
  const [payments, setPayments] = useState([]);
  const { t } = useLanguage();

  const statusOptions = ["all", "pending", "approved", "rejected"];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  const openModal = (url) => {
    setModalImage(url);
    setModalOpen(true);
  };

  const closeModal = () => {
    setClosing(true);
  setTimeout(() => {
    setModalOpen(false);
    setModalImage(null);
    setClosing(false);
  }, 250); 
  };

  const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("all");

const [closing, setClosing] = useState(false);

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
                
                console.log(res)
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
    console.log("🔥 API CALL", id, status);

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
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    console.log("🔥 AFTER API CALL", id, status);

    if (!res.ok) {
    const err = await res.json();
    console.error(err);
    toast.error(t("somethingWentWrong"));
    return;
  }

  toast.success(
    status === "Approved"
      ? t("approvedSuccessfully")
      : t("rejectedSuccessfully")
  );


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


function MobilePaymentCard({
  payment,
  activeTab,
  onAction,
  onImageClick,
  t,
}) {
  const [open, setOpen] = useState(false);

  const status =
    payment.request_status || payment.verification_status || "pending";

  const isPending =
    status.toLowerCase() === "pending";

  return (
    <div className={styles.mobileCard}>
      {/* HEADER */}
      <div className={styles.cardTop}>
        <div>
          <strong>{payment.user_name}</strong>
          <div className={styles.subText}>{payment.email}</div>
        </div>

        <button
          className={styles.expandBtn}
          onClick={() => setOpen(!open)}
          aria-label="Toggle details"
        >
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* ALWAYS VISIBLE */}
      <div className={styles.cardRow}>
        <span>{t("amount")}:</span>
        ₹{Number(payment.amount).toFixed(2)}
      </div>

      <div className={styles.cardRow}>
        <span>{t("status")}:</span>
        {statusBadge(status)}
      </div>

      {/* ACTIONS — ALWAYS VISIBLE */}

      {/* DROPDOWN */}
      <div className={`${styles.dropdown} ${open ? styles.open : ""}`}>
        <div className={styles.grid}>
          {/* CASH */}
          {activeTab === "cash" && (
            <>
              <div>
                <span>{t("month")}</span>
                {payment.month}
              </div>
              <div>
                <span>{t("year")}</span>
                {payment.year}
              </div>
            </>
          )}

          {/* DAILY */}
          {activeTab === "daily" && (
            <div>
              <span>{t("requestedAt")}</span>
              {new Date(payment.requested_at).toLocaleDateString()}
            </div>
          )}

          {/* VERIFY */}
          {activeTab === "verify" && (
            <>
              <div>
                <span>{t("billingStart")}</span>
                {payment.billing_start_date || "-"}
              </div>
              <div>
                <span>{t("billingEnd")}</span>
                {payment.billing_end_date || "-"}
              </div>
            </>
          )}

          <div>
            <span>{t("leaveDays")}</span>
            {payment.leave_days || 0}
          </div>
        </div>

        {payment.screenshot_url && (
          <img
            src={payment.screenshot_url}
            alt={t("paymentProof")}
            className={styles.thumbnail}
            onClick={() => onImageClick(payment.screenshot_url)}
          />
        )}
      </div>
      <div className={styles.actions}>
        {isPending ? (
          <>
            <button
              className={styles.approveBtn}
              onClick={() =>
                onAction(
                  payment.id,
                  activeTab === "verify" ? "approved" : "Approved"
                )
              }
            >
              {t("approve")}
            </button>

            <button
              className={styles.rejectBtn}
              onClick={() =>
                onAction(
                  payment.id,
                  activeTab === "verify" ? "rejected" : "Rejected"
                )
              }
            >
              {t("reject")}
            </button>
          </>
        ) : (
          <span className={styles.processed}>{t("processed")}</span>
        )}
      </div>
    </div>
  );
}




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
  </div>
       <div className={styles.filterBar}>
  <DayDropdown
    options={statusOptions}
    value={statusFilter}
    onChange={setStatusFilter}
  />
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
//                   <tr key={p.id} className={p._updated ? styles.updatedRow : ""}>
//                     <td>{i + 1}</td>
//                     <td>
//   <div className={styles.userInfo}>
//     <strong>{p.user_name}</strong>
//     <div className={styles.email}>{p.email}</div>
//   </div>
// </td>


//                     <td data-col="right">₹{Number(p.amount).toFixed(2)}</td>

//                     {activeTab === "cash" && <td>{p.month}</td>}
//                     {activeTab === "cash" && <td data-col="right">{p.year}</td>}

//                     {activeTab === "verify" && <td>{p.payment_type}</td>}
//                     {activeTab === "verify" && <td data-col="right">{p.billing_start_date || "-"}</td>}
//                     {activeTab === "verify" && <td>{p.billing_end_date || "-"}</td>}

//                     <td>{p.leave_days || 0} { t("leave_days")}</td>
//                     <td data-col="right">{statusBadge(p.request_status || p.verification_status)}</td>
//                     <td> <span>
//                       At:{new Date(p.submitted_at || p.requested_at).toLocaleDateString()}
//                       </span>
//                       </td>

//                     {activeTab === "verify" && (
//                       <td>
//                         {p.screenshot_url && (
//                           <img
//                             src={p.screenshot_url}
//                             alt={t("paymentProof")}
//                             className={styles.thumbnail}
//                             onClick={() => openModal(p.screenshot_url)}
//                           />
//                         )}
//                       </td>
//                     )}

//                     <td data-col="right"> 
//                       {/* VERIFY TAB */}
//                       {activeTab === "verify" &&
//                         (p.verification_status === "pending" ? (
//                           <div className={styles.actions}>
//                             <button
//                               onClick={() => handleAction(p.id, "approved")}
//                               className={styles.approveBtn}
//                             >
//                               {t("approve")}
//                             </button>
//                             <button
//                               onClick={() => handleAction(p.id, "rejected")}
//                               className={styles.rejectBtn}
//                             >
//                               {t("reject")}
//                             </button>
//                           </div>
//                         ) : (
//                           <span className={styles.processed}>{t("processed")}</span>
//                         ))}

//                       {/* CASH & DAILY TABS */}
//                       {(activeTab === "cash" || activeTab === "daily") &&
//                         (p.request_status === "Pending" ? (
//                           <div className={styles.actions}>
//                             <button
//                               onClick={() => handleAction(p.id, "Approved")}
//                               className={styles.approveBtn}
//                             >
//                               {t("approve")}
//                             </button>
//                             <button
//                               onClick={() => handleAction(p.id, "Rejected")}
//                               className={styles.rejectBtn}
//                             >
//                               {t("reject")}
//                             </button>
//                           </div>
//                         ) : (
//                           <span  className={styles.processed}>{t("processed")}</span>
//                         ))}
//                     </td>
//                   </tr>

<MobilePaymentCard
    key={p.id}
    payment={p}
    activeTab={activeTab}
    t={t}
    onAction={handleAction}
    onImageClick={openModal}
  />
                ))
              )}
            </tbody>
          </table>

          {modalOpen && (
            <div className={`${styles.modalOverlay} ${closing ? styles.closing : ""}`} onClick={closeModal}>
              <div className={`${styles.modalContent} ${closing ? styles.closing : ""}`}onClick={(e) => e.stopPropagation()}>
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
