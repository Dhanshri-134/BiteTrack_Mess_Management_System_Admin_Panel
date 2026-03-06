import { API_BASE } from "../lib/api";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AttendanceCalendar from "../components/AttedanceCalendar";
import styles from "../styles/billing.module.css";
import PaymentHistory from "./paymentHistory";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { FaWhatsapp, FaMoneyBillWave } from "react-icons/fa";
import { useRouter } from "next/router";

export default function BillsPage() {

  const [openActions, setOpenActions] = useState(null);
  const [activeTab, setActiveTab] = useState("bills");

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const [waDrawer, setWaDrawer] = useState(null);

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [paymentStatusModal, setPaymentStatusModal] = useState(null);

  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [confirmUnmark, setConfirmUnmark] = useState({
    show: false,
    bill: null,
  });

  const [selectedUserId, setSelectedUserId] = useState(null);

  const [expandedCard, setExpandedCard] = useState(null);

  const [paymentModal, setPaymentModal] = useState(null); // { bill } or null
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_type: "monthly",
    payment_method: "",
    upi_id: "",
    transaction_id: "",
    receipt_number: "",
    payment_date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const [billingType, setBillingType] = useState("monthly");

  const [messAccess, setMessAccess] = useState(null);

  const [advanceModal, setAdvanceModal] = useState(null);

  const [advanceData, setAdvanceData] = useState({
    amount: "",
    payment_method: "",
    notes: ""
  });

  const [existingAdvance, setExistingAdvance] = useState(null);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchAccess = async () => {
      try {
        const data = await offlineFetch("mess-access", async () => {
          const res = await fetch(
            `${API_BASE}/api/mess/access/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!res.ok) throw new Error("Failed to fetch access");
          return res.json();
        });

        setMessAccess(data || {});
      } catch (err) {
        console.error("Access unavailable offline");
        setMessAccess({});
      }
    };

    fetchAccess();
  }, []);

  const openAdvanceModal = async (bill) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/advance/fetch/?user_id=${bill.user_id}&month=${bill.month}&year=${bill.year}`,
        // `https://bite-track-mess-management-system-a.vercel.app/api/advance/fetch/?user_id=${bill.user_id}&month=${bill.month}&year=${bill.year}`,
        { headers: authHeaders() }
      );

      const data = await res.json();
      setExistingAdvance(data || null);
      setAdvanceData({
        amount: "",
        payment_method: "",
        notes: ""
      });
      setAdvanceModal(bill);
    } catch (err) {
      console.error(err);
    }
  };


  const submitAdvance = async (type = "add") => {

    if (!advanceData.amount) {
      return toast.error(t("enterAmount"));
    }

    try {
      const payload = {
        user_id: advanceModal.user_id,
        month: advanceModal.month,
        year: advanceModal.year,
        advance_amount: Number(advanceData.amount),
        payment_method: advanceData.payment_method,
        notes: advanceData.notes,
        action: type
      };

      const res = await fetch(
        `${API_BASE}/api/advance/update/`,
        // "https://bite-track-mess-management-system-a.vercel.app/api/advance/update/",
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload)
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t("advanceUpdated"));
      setAdvanceModal(null);
      fetchBills();
    } catch (err) {
      toast.error(err.message);
    }

  };

const openWhatsAppDrawer = (bill) => {

  const defaultMessage = `Hello ${bill.name},

Your mess bill for ${bill.month}/${bill.year}

Amount: ₹${Number(bill.total_payable || 0).toFixed(2)}

Please clear your payment at the earliest.

Thank you.`;

  setWaMessage(defaultMessage);
  setWaDrawer(bill);
};  

  const closeWhatsAppDrawer = () => {
    setWaDrawer(null);
  };

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const { search: searchQuery, month: m, year: y } = router.query;
    if (searchQuery) {
      setSearch(searchQuery);
    }
    if (m) setMonth(m);
    if (y) setYear(y);

  }, [router.isReady]);

const sendWhatsApp = (mobile) => {

  if (!mobile) {
    toast.error(t("mobileNotFound"));
    return;
  }

  const formattedNumber = mobile.replace(/\D/g, "");

  const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(
    waMessage
  )}`;

  window.open(url, "_blank");

  closeWhatsAppDrawer();
};

  const TooltipText = ({ value }) => {
    const [pos, setPos] = useState({ x: 0, y: 0, show: false });

    useEffect(() => {
      if (!pos.show) return;

      const hide = () => setPos(p => ({ ...p, show: false }));

      window.addEventListener("scroll", hide, { passive: true });
      window.addEventListener("resize", hide);
      window.addEventListener("touchstart", hide);

      return () => {
        window.removeEventListener("scroll", hide);
        window.removeEventListener("resize", hide);
        window.removeEventListener("touchstart", hide);
      };
    }, [pos.show]);

    const showTooltip = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const tooltipWidth = 220;
      const padding = 8;

      let x = r.left + r.width / 2 - tooltipWidth / 2;
      let y = r.top - 10;

      if (x < padding) x = padding;
      if (x + tooltipWidth > window.innerWidth - padding) {
        x = window.innerWidth - tooltipWidth - padding;
      }
      if (y < padding) y = r.bottom + 10;

      setPos({ x, y, show: true });
    };

    return (
      <span
        className={styles.truncate}
        tabIndex={0}
        onMouseEnter={showTooltip}
        onFocus={showTooltip}
        onMouseLeave={() => setPos(p => ({ ...p, show: false }))}
        onBlur={() => setPos(p => ({ ...p, show: false }))}
      >
        {value}

        {pos.show && (
          <span
            className={styles.tooltip}
            style={{ left: pos.x, top: pos.y, width: 220 }}
          >
            {value}
          </span>
        )}
      </span>
    );
  };


  const getBillAmount = (b) => {

    // if per_day_rate access OFF → always monthly price
    if (!messAccess?.per_day_rate) {
      const price = (b.monthly_price || "₹0").replace(/[₹,]/g, "");
      return Number(price);
    }

    // daily billing
    if (billingType === "daily") {
      return Number(b.days_billed) * Number(b.chosen_per_day_rate);
    }

    // monthly billing
    if (billingType === "monthly") {
      const price = (b.monthly_price || "₹0").replace(/[₹,]/g, "");
      return Number(price);
    }

    return Number(b.total_amount);
  };


  const openPaymentModal = (bill) => {
    setPaymentData({
      amount: bill.total_amount ?? 0,
      payment_type: "monthly",
      payment_method: "",
      upi_id: "",
      transaction_id: "",
      receipt_number: `REC-${bill.user_id}-${bill.month}-${bill.year}-${Date.now()}`,
      payment_date: new Date().toISOString().slice(0, 10),
      note: "",
    });
    setPaymentModal({
      ...bill,
      month: bill.month ?? month,
      year: bill.year ?? year,
    });
  };


  const isMonthYearSelected = month && year && year.length === 4;


  const [pdfBase64, setPdfBase64] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const [waMessage, setWaMessage] = useState("");

  const closeModal = () => {
    setIsOpen(false);
    setPdfBase64(null);
  };

  const submitPayment = async () => {
    if (!paymentModal) return;

    if (!paymentData.amount || Number(paymentData.amount) <= 0)
      return toast.error(t("enterValidAmount"));

    if (!paymentData.payment_method)
      return toast.error(t("selectPaymentMethod"));

    // 🔥 AUTO GENERATE CASH TRANSACTION ID
    let transactionId = paymentData.transaction_id;

    if (paymentData.payment_method === "Cash") {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");

      transactionId = `CASH-${dd}${mm}${yyyy}-${hh}${min}`;
    }

    const payload = {
      user_id: paymentModal.user_id,
      month: paymentModal.month,
      year: Number(paymentModal.year),

      amount: Number(paymentData.amount),
      payment_date: paymentData.payment_date,

      payment_type: paymentData.payment_type,
      payment_method: paymentData.payment_method,
      transaction_id: transactionId || null,
      upi_id: paymentData.upi_id || null,

      receipt_number: paymentData.receipt_number,

      leave_days: paymentModal.leave_days || 0,

      billing_start_date: paymentModal.start_date,
      billing_end_date: paymentModal.end_date,

      note: paymentData.note?.trim() || null
    };

    try {
      const res = await fetch(
        `${API_BASE}/api/bills/mark-paid/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(t("paymentRecorded"));
      setPaymentModal(null);
      fetchBills();
    } catch (err) {
      toast.error(err.message ||t("somethingWrong"));
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

  const fetchBills = async () => {
    try {
      setLoading(true);

      const isFiltered = month && year;

      const cacheKey = isFiltered
        ? `bills-${month}-${year}`
        : `bills-all`;

      const url =
        `${API_BASE}/api/bills/all/`;
      //  `https://bite-track-mess-management-system-a.vercel.app/api/bills/all/`;



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
    // if (!month || !year || year.length !== 4) return;
    fetchBills();
  }, [month, year]);


  useAppRefresh(fetchBills);


  // Actions
  const togglePaid = async (userId, billMonth, billYear) => {
    try {
      const res = await fetch(`${API_BASE}/api/bills/toggle-paid/`, {
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
      toast.error(t("tryAgain"));
    }
  };

  const downloadMonthlyPDF = () => {
    if (!isMonthYearSelected) {
      toast(t("selectMonthYear"));
      return;
    }

    const token = localStorage.getItem("token");

    const url =
      `${API_BASE}/api/bills/downloadPDF/` +
      `?month=${month}&year=${year}&token=${token}`;

    // 🔥 This triggers Android download UI
    window.location.href = url;
  };

  // Filtered for UI
  const userIdFromQuery = router.isReady ? router.query.userId : null;



  const groupedBills = (() => {

    const map = {};

    bills.forEach((b) => {

      const key = b.user_id;

      if (!map[key]) {

        map[key] = {
          ...b,

          pending_amount: 0,
          advance_amount: b.advance_amount || 0,

          payable: 0,
          total_payable: 0,

          has_pending: false
        };

      }

      const amount = getBillAmount(b);

      const isCurrent =
  !month || !year
    ? true
    : Number(b.month) === Number(month) &&
      Number(b.year) === Number(year);

      if (isCurrent) {
        map[key].payable = amount;
        map[key].start_date = b.start_date;
        map[key].end_date = b.end_date;
      }

      if (!b.paid && !isCurrent) {
        map[key].pending_amount += amount;
        map[key].has_pending = true;
      }

    });

    Object.values(map).forEach((u) => {

      const advance = Number(u.advance_amount || 0);

      u.total_payable =
        Number(u.payable) -
        advance +
        Number(u.pending_amount);

    });

    return Object.values(map);

  })();





  const filtered = groupedBills.filter((b) => {
    if (userIdFromQuery && String(b.user_id) !== String(userIdFromQuery)) {
      return false;
    }

    if (statusFilter !== "all") {
      if (statusFilter === "paid" && !b.paid) return false;
      if (statusFilter === "unpaid" && b.paid) return false;
    }

    if (!search) return true;

    return `${b.name || ""} ${b.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
  });

  const downloadExcel = () => {
    if (!month || !year) {
      toast(t("selectMonthYear"));
      return;
    }

    const token = localStorage.getItem("token");

    const url =
      `${API_BASE}/api/bills/download/` +
      `?month=${month}&year=${year}&token=${token}`;

    // 🔥 Android WebView download trigger
    window.location.href = url;
  };


  const openPaymentStatus = (bill) => {

    const history = bills
      .filter(b => b.user_id === bill.user_id)
      .sort((a, b) => {
        if (a.year === b.year) return b.month - a.month;
        return b.year - a.year;
      });

    setPaymentStatusModal({
      user: bill.name,
      history
    });

  };


  const { t } = useLanguage();

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{t("billing")}</h1>

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

          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${activeTab === "bills" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("bills")}
            >
              {t("allBills")}
            </button>

            <button
              className={`${styles.tabBtn} ${activeTab === "payments" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("payments")}
            >
              {t("paymentHistory")}
            </button>

            <div
              className={styles.tabIndicator}
              style={{
                transform: activeTab === "bills" ? "translateX(0%)" : "translateX(100%)",
              }}
            />
          </div>
          {activeTab === "bills" && (
            <>
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
                {messAccess?.per_day_rate && (
                  <div className={styles.controlItem}>
                    <label>{t("billingType")}</label>

                    <select
                      className={styles.dropdown}
                      value={billingType}
                      onChange={(e) => setBillingType(e.target.value)}
                    >
                      <option value="daily">{t("dailyBilling")}</option>
<option value="monthly">{t("monthlyBilling")}</option>
                    </select>
                  </div>
                )}

                <div className={styles.controlItem}>
                  <label>{t("search")}</label>
                  <input placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>

                <div className={styles.controlItemActions}>
                  <button className={styles.btnPrimary} onClick={fetchBills}>{t("refresh")}</button>
                  <button
                    className={`${styles.btnSecondary} ${!isMonthYearSelected ? styles.btnDisabledDownload : ""
                      }`}
                    onClick={downloadMonthlyPDF}
                    disabled={!isMonthYearSelected}
                  >
                    {t("downloadMonthlyPdf")}
                  </button>

                  <button
                    className={`${styles.btnSecondary} ${!isMonthYearSelected ? styles.btnDisabledDownload : ""
                      }`}
                    onClick={downloadExcel}
                    disabled={!isMonthYearSelected}
                  >
                    {t("downloadExcel")}
                  </button>

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
                            {isMonthYearSelected &&
                              <th>{t("duration")}</th>
                            }
                            {messAccess?.per_day_rate && <th>{t("days")}</th>}
                            {messAccess?.per_day_rate && <th>{t("perDayRate")}</th>}
                            {/* <th>{t("totalAmount")}</th> */}
                            <th>{t("payable")}</th>
                            <th>{t("advance")}</th>
                            <th>{t("pending")}</th>
                            <th>{t("totalPayable")}</th>
                            <th>{t("paymentStatus")}</th>
                            <th>{t("note")}</th>
                            <th>{t("actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((b, idx) => (
                            <tr key={b.user_id}>
                              <td>{idx + 1}</td>
                              <td>{b.name || b.user_name || "-"}
                               <br></br>
                                  <TooltipText value={b.email || "-"} />
                                
                                  </td>

                              {isMonthYearSelected && (
                                <>
                                  <td>{b.start_date || "-"} {t("to")} {b.end_date || "-"}</td>
                                </>
                              )}
                              {messAccess?.per_day_rate && (
                                <td>{b.days_billed}</td>
                              )}

                              {messAccess?.per_day_rate && (
                                <td>{Number(b.chosen_per_day_rate).toFixed(2)}</td>
                              )}
                              {/* <td>{getBillAmount(b).toFixed(2)}</td>
                              <td>{b.paid ? t("paid") : t("unpaid")}</td> */}
                              <td>
  ₹{Number(b.payable || 0).toFixed(2)}
</td>

                              <td>{Number(b.advance_amount || 0).toFixed(2)}</td>

                              <td>{Number(b.pending_amount || 0).toFixed(2)}</td>

                              <td>{Number(b.total_payable).toFixed(2)}</td>

                              <td>
                                {b.has_pending ? t("pending") : t("clear")}
                              </td>
                              <td title={b.note || ""}>
                                {b.note ? b.note.slice(0, 25) + (b.note.length > 25 ? "…" : "") : "—"}
                              </td>

                             <td className={styles.actionsCell}>



  {/* MORE ACTIONS */}
  <div className={styles.actionMenuWrapper}>
    <button
      className={styles.btnMore}
      onClick={() =>
        setOpenActions(openActions === b.user_id ? null : b.user_id)
      }
      
    >
      {t("clickHere")}
    </button>

    {openActions === b.user_id && (
      <div className={styles.actionDropdown}>
  {/* PRIMARY ACTION */}
  <button
    className={`${
      b.paid ? styles.btnPaidDisabled : styles.btnPaid
    }`}
    disabled={b.paid}
    onClick={() => {
      if (!b.paid) openPaymentModal(b);
    }}
  >
    {b.paid ? t("paid") : t("markPaid")}
  </button>

        <button
          onClick={() => {
            setSelectedAttendance({
              year: b.year,
              month: b.month,
              attendanceMap: b.attendance_map,
              name: b.name,
            });
            setOpenActions(null);
          }}
        >
          {t("viewCalendar")}
        </button>

        <button
          onClick={() => {
            openPaymentStatus(b);
            setOpenActions(null);
          }}
        >
          {t("paymentStatusLabel")}
        </button>

        <button
          onClick={() => {
            openAdvanceModal(b);
            setOpenActions(null);
          }}
        >
          {t("addAdvance")}
        </button>

        <button
          onClick={() => {
            openWhatsAppDrawer(b);
            setOpenActions(null);
          }}
        >
          {t("sendMessage")}
        </button>

      </div>
    )}
  </div>

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


                          <div
                            className={styles.cardHeader}
                            onClick={() =>
                              setExpandedCard(expandedCard === idx ? null : idx)
                            }
                          >
                            <div className={styles.headerLeft}>
                              <strong>{b.name}</strong>
                              <div>
                                <button
                                  className={styles.btnAdvance}
                                  onClick={() => openAdvanceModal(b)}
                                >
                                  <FaMoneyBillWave size={20} />
                                </button>
                                <button
                                  className={styles.inlineWhatsapp}
                                  onClick={(e) => {
                                    e.stopPropagation(); 
                                    openWhatsAppDrawer(b);
                                  }}
                                >
                                  <FaWhatsapp size={20} color="#25D366" />
                                </button>
                              </div>

                            </div>

                            <div className={styles.cardBody}>
                              <div className={styles.cardRow}>
                                <span>{t("email")}</span>
                                <strong><TooltipText value={b.email || "-"} /></strong>
                              </div>
                              <div className={styles.cardRow}>
                                <span>{t("mobile")}</span>
                                <strong>{Number(b.mobile)}</strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("parentContact")}</span>
                                <strong>{b.parent_mobile}</strong>
                              </div>
                            </div>

                          </div>


                          {expandedCard === idx && (
                            <div className={styles.cardBody}>

                              <div className={styles.cardRow}>
                                <span>{t("payable")}</span>
                                <strong>
                                
  ₹{Number(b.payable || 0).toFixed(2)}

                                </strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("advance")}</span>
                                <strong>
                                  ₹{Number(b.advance_amount || 0).toFixed(2)}
                                </strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("pending")}</span>
                                <strong>
                                  ₹{Number(b.pending_amount || 0).toFixed(2)}
                                </strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("totalPayable")}</span>
                                <strong>
                                  ₹{Number(b.total_payable).toFixed(2)}
                                </strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("status")}</span>
                                <strong>
                                  {b.has_pending ? t("pending") : t("clear")}
                                </strong>
                              </div>

                              {messAccess?.per_day_rate && (
                                <>

                                  <div className={styles.cardRow}>
                                    <span>{t("days")}</span>
                                    <strong>{b.days_billed}</strong>
                                  </div>


                                  <div className={styles.cardRow}>
                                    <span>{t("rate")}</span>
                                    <strong>₹{Number(b.chosen_per_day_rate).toFixed(2)}</strong>
                                  </div>
                                </>
                              )}
                              {/* PAYMENT HISTORY EXPAND */}
                              <div className={styles.mobileHistory}>
                                <div className={styles.historyTitle}>
                                  {t("paymentHistory")}
                                </div>

                                {bills
                                  .filter(x => x.user_id === b.user_id)
                                  .sort((a, b) => {
                                    if (a.year === b.year) return b.month - a.month;
                                    return b.year - a.year;
                                  })
                                  .map(h => {

                                    const amount = getBillAmount(h);

                                    return (
                                      <div
                                        key={`${h.user_id}-${h.year}-${h.month}`}
                                        className={styles.mobileHistoryItem}
                                      >

                                        <div className={styles.mobilerow}>
                                          <span>{t("month")}</span>
                                          {h.month}/{h.year}
                                        </div>

                                        <div className={styles.mobilerow}>
                                          <span>{t("amount")}</span>
                                          ₹{amount.toFixed(2)}
                                        </div>

                                        <div className={styles.mobilerow}>
                                          <span>{t("billing")}</span>
                                          {h.start_date} → {h.end_date}
                                        </div>

                                        <div className={styles.mobilerow}>
                                          <span>{t("status")}</span>
                                          {h.paid ? t("paid") : t("pending")}
                                        </div>

                                      </div>
                                    );

                                  })}
                              </div>
                              {b.note && (
                                <div className={styles.cardRow}>
                                  <span>{t("note")}</span>
                                  <strong>{b.note}</strong>
                                </div>
                              )}

                              <div className={styles.cardActions}>
                                <button
                                  className={`${styles.btnAction} ${b.paid ? styles.btnPaidDisabled : styles.btnPaid}`}
                                  disabled={b.paid}
                                  onClick={() => !b.paid && openPaymentModal(b)}
                                >
                                  {b.paid ? t("paid") : t("markPaid")}
                                </button>
                                <button
                                  className={`${styles.btnAction} ${styles.btnCalendar}`}
                                  onClick={() =>
                                    setSelectedAttendance({
                                      year: b.year,
                                      month: b.month,
                                      attendanceMap: b.attendance_map || {},
                                      ownerMarkedDates: b.owner_marked_dates || [],
                                      name: b.name,
                                    })
                                  }
                                >
                                  {t("viewCalendar")}
                                </button>
                                
                              </div>
                            </div>
                          )}
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

                    <div className={styles.formGroup}>
                      <label>{t("note")}</label>
                      <textarea
                        rows={3}
                        placeholder={t("notePlaceholder") || "Optional note (e.g. Late payment, Discount applied)"}
                        value={paymentData.note}
                        onChange={(e) =>
                          setPaymentData({ ...paymentData, note: e.target.value })
                        }
                      />
                    </div>


                    <div className={styles.modalActions}>
                      <button
                        className={styles.btnPrimary}
                        onClick={submitPayment}
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
                      {/* <button className={styles.closeX} onClick={() => setSelectedAttendance(null)}>✕</button> */}
                    </div>
                    <AttendanceCalendar year={selectedAttendance.year} month={selectedAttendance.month} attendanceMap={selectedAttendance.attendanceMap} ownerMarkedDates={selectedAttendance.ownerMarkedDates} />
                    <div style={{ textAlign: "right", marginTop: 12 }}>
                      <button className={styles.btnSecondary} onClick={() => setSelectedAttendance(null)}>{t("close")}</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === "payments" && (
            <PaymentHistory
              token={token}
            />
          )}
         {waDrawer && (
  <div className={styles.waOverlay} onClick={closeWhatsAppDrawer}>
    <div
      className={styles.waModal}
      onClick={(e) => e.stopPropagation()}
    >

      <h3>{t("sendWhatsApp")}</h3>

      <div className={styles.waUser}>
        <strong>{waDrawer.name}</strong>
      </div>

      <textarea
        className={styles.waTextarea}
        value={waMessage}
        onChange={(e) => setWaMessage(e.target.value)}
      />

      <div className={styles.waButtons}>
        <button
          className={styles.waSend}
          onClick={() => sendWhatsApp(waDrawer.mobile)}
        >
          {t("sendToStudent")}
        </button>

        <button
          className={styles.waSend}
          onClick={() => sendWhatsApp(waDrawer.parent_mobile)}
        >
          {t("sendToParent")}
        </button>

        <button
          className={styles.waCancel}
          onClick={closeWhatsAppDrawer}
        >
          {t("cancel")}
        </button>
      </div>

    </div>
  </div>
)}

          {advanceModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3>{t("advancePayment")} — {advanceModal.name}</h3>
                {existingAdvance && (
                  <div className={styles.advanceBalance}>
                    {t("currentBalance")}: ₹{existingAdvance.advance_amount}
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>{t("amount")}</label>
                  <input
                    type="number"
                    value={advanceData.amount}
                    onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>{t("paymentMethod")}</label>
                  <select
                    value={advanceData.payment_method}
                    onChange={(e) => setAdvanceData({ ...advanceData, payment_method: e.target.value })}
                  >
                    <option value="">{t("select")}</option>
                    <option value="Cash">{t("Cash")}</option>
                    <option value="UPI">{t("UPI")}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t("notes")}</label>
                  <textarea
                    rows={3}
                    value={advanceData.notes}
                    onChange={(e) => setAdvanceData({ ...advanceData, notes: e.target.value })}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => submitAdvance("add")}
                  >
                    +{t("addAdvance")}
                  </button>
                  <button
                    className={styles.btnDanger}
                    onClick={() => submitAdvance("minus")}
                  >
                    − {t("deduct")}
                  </button>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setAdvanceModal(null)}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}
          {paymentStatusModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent} style={{ maxWidth: "520px" }}>
                <h3>{paymentStatusModal.user} — {t("paymentHistory")}</h3>
                <table className={styles.modalTable}>
                  <thead>
                    <tr>
                      <th>{t("month")}</th>
                      <th>{t("startDate")}</th>
                      <th>{t("endDate")}</th>
                      <th>{t("amount")}</th>
                      <th>{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentStatusModal.history.map((h, i) => {
                      const amount = getBillAmount(h);
                      return (
                        <tr key={`${h.user_id}-${h.year}-${h.month}`}>
                          <td>{h.month}/{h.year}</td>
                          <td>{h.start_date}</td>
                          <td>{h.end_date}</td>
                          <td>₹{amount.toFixed(2)}</td>
                          <td>
                            {h.paid
                              ? <span style={{ color: "green" }}>{t("paid")}</span>
                              : <span style={{ color: "red" }}>{t("pending")}</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ textAlign: "right", marginTop: 15 }}>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setPaymentStatusModal(null)}
                  >
                    {t("close")}
                  </button>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );

}
