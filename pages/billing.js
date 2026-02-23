import { useAppRefresh } from "@/lib/useAppRefresh";


// pages/billing.js
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import AttendanceCalendar from "../components/AttedanceCalendar";
import styles from "../styles/billing.module.css";
import PaymentHistory from "./paymentHistory";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { FaWhatsapp } from "react-icons/fa";
import { useRouter } from "next/router";



export default function BillsPage() {

  const [activeTab, setActiveTab] = useState("bills");

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const [waDrawer, setWaDrawer] = useState(null);

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



  const openWhatsAppDrawer = (bill) => {
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


//   useEffect(() => {
//   if (!router.isReady) return;

//   const { userId, month: m, year: y } = router.query;

//   if (m) setMonth(m);
//   if (y) setYear(y);

//   if (userId) {
//     setSelectedUserId(userId);

//     // 🔥 Remove userId from URL immediately
//     router.replace(
//       {
//         pathname: "/billing",
//         query: { month: m, year: y },
//       },
//       undefined,
//       { shallow: true }
//     );
//   }
// }, [router.isReady]);


  const sendWhatsApp = (mobile, bill) => {
    if (!mobile) {
      toast.error("Mobile number not found");
      return;
    }

    const message = `
Hello ${bill.name},

Your mess bill for ${bill.month}/${bill.year}
Amount: ₹${Number(bill.total_amount).toFixed(2)}

Please clear the payment on time.

Thank you.
`;

    const formattedNumber = mobile.replace(/\D/g, "");
    const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;

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
      note: paymentData.note?.trim() || null
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
        ? `https://bite-track-mess-management-system-a.vercel.app/api/bills/fetch/?month=${month}&year=${year}`
        // ? `/api/bills/fetch/?month=${month}&year=${year}`
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
    // if (!month || !year || year.length !== 4) return;
    fetchBills();
  }, [month, year]);


  useAppRefresh(fetchBills);


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



  const downloadMonthlyPDF = () => {
    if (!isMonthYearSelected) {
      toast("Please select month and year.");
      return;
    }

    const token = localStorage.getItem("token");

    const url =
      `https://bite-track-mess-management-system-a.vercel.app/api/bills/downloadPDF/` +
      `?month=${month}&year=${year}&token=${token}`;

    // 🔥 This triggers Android download UI
    window.location.href = url;
  };

  // Filtered for UI
const userIdFromQuery = router.isReady ? router.query.userId : null;

const filtered = bills.filter((b) => {
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
      toast("Please select month and year.");
      return;
    }

    const token = localStorage.getItem("token");

    const url =
      `https://bite-track-mess-management-system-a.vercel.app/api/bills/download/` +
      `?month=${month}&year=${year}&token=${token}`;

    // 🔥 Android WebView download trigger
    window.location.href = url;
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
                            <th>{t("email")}</th>
                            <th>{t("status")}</th>
                            <th>{t("startDate")}</th>
                            <th>{t("endDate")}</th>
                            <th>{t("days")}</th>
                            <th>{t("perDayRate")}</th>
                            <th>{t("totalAmount")}</th>
                            <th>{t("paymentStatus")}</th>
                            <th>{t("note")}</th>
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
                              <td title={b.note || ""}>
                                {b.note ? b.note.slice(0, 25) + (b.note.length > 25 ? "…" : "") : "—"}
                              </td>

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
                          {/* <div className={styles.cardRow}><span>{t("srNo")}</span><strong>{idx + 1}</strong></div>
                          <div className={styles.cardRow}><span>{t("user")}</span><strong><TooltipText value={`${b.name || "-"}`} /></strong></div>
                          <div className={styles.cardRow}><span>{t("email")}</span><strong><TooltipText value={`${b.email || "-"}`} /></strong></div>
                          <div className={styles.cardRow}><span>{t("status")}</span><strong>{b.status}</strong></div>
                          <div className={styles.cardRow}><span>{t("startDate")}</span><strong>{b.start_date || "-"}</strong></div>
                          <div className={styles.cardRow}><span>{t("endDate")}</span><strong>{b.end_date || "-"}</strong></div>
                          <div className={styles.cardRow}><span>{t("days")}</span><strong>{b.days_billed}</strong></div>
                          <div className={styles.cardRow}><span>{t("rate")}</span><strong>₹{Number(b.chosen_per_day_rate).toFixed(2)}</strong></div>
                          <div className={styles.cardRow}><span>{t("total")}</span><strong>₹{Number(b.total_amount).toFixed(2)}</strong></div>
                          <div className={styles.cardRow}><span>{t("payment")}</span><strong>{b.paid ? t("paid") : t("unpaid")}</strong></div>
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
                          </div>*/}

                          <div
                            className={styles.cardHeader}
                            onClick={() =>
                              setExpandedCard(expandedCard === idx ? null : idx)
                            }
                          >
                            <div className={styles.headerLeft}>
                              <strong>{b.name}</strong>

                              <button
                                className={styles.inlineWhatsapp}
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent collapse toggle
                                  openWhatsAppDrawer(b);
                                }}
                              >
                                <FaWhatsapp size={20} color="#25D366" />
                              </button>
                              {/* <span>
  </span> */}
                            </div>

                            <div className={styles.cardBody}>
                              <div className={styles.cardRow}>
                                <span>{t("mobile")}</span>
                                <strong>{Number(b.mobile)}</strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("parentContact")}</span>
                                <strong>{b.parent_mobile}</strong>
                              </div>
                            </div>
                            <div className={styles.cardRow}>
                              <span>{t("total")}</span>
                              <strong>₹{Number(b.total_amount).toFixed(2)}</strong>
                            </div>

                            <div className={styles.cardRow}>
                              <span>{t("paymentStatus")}</span>
                              <strong>{b.paid ? t("paid") : t("unpaid")}</strong>
                            </div>

                          </div>


                          {expandedCard === idx && (
                            <div className={styles.cardBody}>

                              <div className={styles.cardRow}>
                                <span>{t("email")}</span>
                                <strong>{b.email || "-"}</strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("status")}</span>
                                <strong>{b.status}</strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("startDate")}</span>
                                <strong>{b.start_date || "-"}</strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("endDate")}</span>
                                <strong>{b.end_date || "-"}</strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("days")}</span>
                                <strong>{b.days_billed}</strong>
                              </div>

                              <div className={styles.cardRow}>
                                <span>{t("rate")}</span>
                                <strong>₹{Number(b.chosen_per_day_rate).toFixed(2)}</strong>
                              </div>

                              {/* <div className={styles.cardRow}>
      <span>{t("total")}</span>
      <strong>₹{Number(b.total_amount).toFixed(2)}</strong>
    </div>

    <div className={styles.cardRow}>
      <span>{t("payment")}</span>
      <strong>{b.paid ? t("paid") : t("unpaid")}</strong>
    </div> */}

                              {b.note && (
                                <div className={styles.cardRow}>
                                  <span>{t("note")}</span>
                                  <strong>{b.note}</strong>
                                </div>
                              )}

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
                className={styles.waDrawer}
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Send WhatsApp Message</h3>

                <button
                  className={styles.waOption}
                  onClick={() =>
                    sendWhatsApp(waDrawer.mobile, waDrawer)
                  }
                >
                  To {waDrawer.name}
                </button>

                <button
                  className={styles.waOption}
                  onClick={() =>
                    sendWhatsApp(waDrawer.parent_mobile, waDrawer)
                  }
                >
                  To Parent
                </button>

                <button
                  className={styles.waCancel}
                  onClick={closeWhatsAppDrawer}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </Layout>
  );

}
