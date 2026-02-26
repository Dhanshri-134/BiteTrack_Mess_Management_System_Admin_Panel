

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/table.module.css";
import { offlineFetch } from "@/lib/offlineFetch"; // make sure this exists
import { useLanguage } from "../../context/LanguageContext";
import { Tooltip } from "recharts";
import toast from "react-hot-toast";
import DayDropdown from "../../components/DayDropdown";
import { useAppRefresh } from "@/lib/useAppRefresh";


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



function UserPaymentGroup({ user, activeTab, onAction, onImageClick, t }) {
  const [open, setOpen] = useState(false);

  // sort latest first
  const history = [...user.history].sort(
    (a, b) =>
      new Date(b.submitted_at || b.requested_at) -
      new Date(a.submitted_at || a.requested_at)
  );

  const latest = history[0];

  const rawStatus =
  latest.request_status ||
  latest.verification_status ||
  latest.payment_status ||
  latest.status;

const status = normalizeStatus(rawStatus);

  return (
    <div className={styles.mobileCard}>
      {/* HEADER (Same CSS as MobilePaymentCard) */}
      <div className={styles.cardTop}>
        <div>
          <strong>{user.user_name}</strong>
          <div className={styles.subText}>{user.email}</div>
        </div>

        <button
          className={styles.expandBtn}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Latest summary */}
      <div className={styles.cardRow}>
        <span>{t("latestAmount")}:</span>
        ₹{Number(latest.amount).toFixed(2)}
      </div>

      <div className={styles.cardRow}>
        <span>{t("status")}:</span>
        {statusBadge(status)}
      </div>

      {/* HISTORY DROPDOWN */}
      <div className={`${styles.dropdown} ${open ? styles.open : ""}`}>
        {history.map((p) => {
          const rawItemStatus =
  p.request_status ||
  p.verification_status ||
  p.payment_status ||
  p.status;

const itemStatus = normalizeStatus(rawItemStatus);

          const isPending =
            itemStatus.toLowerCase() === "pending";

          return (
            <div key={p.id} className={styles.grid}>
              <div>
                <span>{t("amount")}</span>
                ₹{Number(p.amount).toFixed(2)}
              </div>

              {activeTab === "cash" && (
                <>
                  <div>
                    <span>{t("month")}</span>
                    {p.month}
                  </div>
                  <div>
                    <span>{t("year")}</span>
                    {p.year}
                  </div>
                </>
              )}

              {activeTab === "daily" && (
                <div>
                  <span>{t("requestedMonth")}</span>
                  {p.month || "-"}
                </div>
              )}

              <div>
                <span>{t("requestedAt")}</span>
                {new Date(
                  p.submitted_at || p.requested_at
                ).toLocaleDateString()}
              </div>

              <div>
                <span>{t("leaveDays")}</span>
                {p.leave_days || 0}
              </div>

              <div>
                <span>{t("status")}</span>
                {statusBadge(itemStatus)}
              </div>
              {p.screenshot_url && (
                <img
                  src={p.screenshot_url}
                  alt={t("paymentProof")}
                  className={styles.thumbnail}
                  onClick={() => onImageClick(p.screenshot_url)}
                />
              )}

              {isPending && (
                <div className={styles.actions}>
                  <button
                    className={styles.approveBtn}
                    onClick={() =>
                      onAction(
                        p.id,
                        activeTab === "verify"
                          ? "approved"
                          : "Approved"
                      )
                    }
                  >
                    {t("approve")}
                  </button>

                  <button
                    className={styles.rejectBtn}
                    onClick={() =>
                      onAction(
                        p.id,
                        activeTab === "verify"
                          ? "rejected"
                          : "Rejected"
                      )
                    }
                  >
                    {t("reject")}
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  
  useAppRefresh(fetchData);
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
  const normalizeStatus = (status) => {
  if (!status) return "pending";

  const s = status.toLowerCase();

  if (s === "paid") return "approved";   // 🔥 main fix
  if (s === "approved") return "approved";
  if (s === "rejected") return "rejected";

  return "pending";
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

const filtered = payments.filter((p) => {
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

  const rawStatus =
  payment.request_status ||
  payment.verification_status ||
  payment.payment_status ||
  payment.status;

const status = normalizeStatus(rawStatus);

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

const groupByUser = (data) => {
  const grouped = {};

  data.forEach((p) => {
    if (!grouped[p.user_id]) {
      grouped[p.user_id] = {
        user_name: p.user_name,
        email: p.email,
        history: [],
      };
    }

    grouped[p.user_id].history.push(p);
  });

  return Object.values(grouped);
};

const groupedPayments = groupByUser(filtered);

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
          <div className={styles.table}>
         

              {groupedPayments.length === 0 ? (
                <>
                                    {t("noRequestsFound", {
                      type:
                        activeTab === "cash"
                          ? t("cash")
                          : activeTab === "daily"
                            ? t("daily")
                            : t("verification"),
                    })}
                    </>
              ) : (

  groupedPayments.map((user, index) => (
  <UserPaymentGroup
    key={index}
    user={user}
    activeTab={activeTab}
    t={t}
    onAction={handleAction}
    onImageClick={openModal}
  />
))
  

              )}
</div>

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
