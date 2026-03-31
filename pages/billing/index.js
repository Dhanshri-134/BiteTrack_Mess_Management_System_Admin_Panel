import { API_BASE } from "../../lib/api";
import { useAppRefresh } from "@/lib/useAppRefresh";
import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import AttendanceCalendar from "../../components/AttedanceCalendar";
import styles from "../../styles/billing.module.css";
import PaymentHistory from "../paymentHistory";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { FaWhatsapp, FaMoneyBillWave, FaPhoneAlt } from "react-icons/fa";
import { useRouter } from "next/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ChartBarIcon, ChevronDown, ChevronUp, Download, Filter, FilterIcon, FilterX, FilterXIcon, Presentation, MoreVertical, DownloadIcon, RefreshCcw } from "lucide-react";
import DayDropdown from "../../components/DayDropdown";
import { downloadFileFromUrl, saveJsPdfDocument } from "../../lib/fileDownload";

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
      onClick={showTooltip}
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

  const [receiptModal, setReceiptModal] = useState(null);

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
  const [exportingPDF, setExportingPDF] = useState(false);
  const [messAccess, setMessAccess] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [advanceModal, setAdvanceModal] = useState(null);

  const [advanceData, setAdvanceData] = useState({
    amount: "",
    payment_method: "",
    notes: ""
  });

  const [existingAdvance, setExistingAdvance] = useState(null);

  const ReceiptModal = () => {
    if (!receiptModal) return null;

    return (
      <div className={styles.receiptModalOverlay} onClick={() => setReceiptModal(null)}>
        <div className={styles.receiptModal} onClick={(e) => e.stopPropagation()}>

          <div className={styles.receiptHeader}>
            <h3>{t("receiptPreview")}</h3>

            <button
              className={styles.downloadBtn}
              onClick={() => window.open(receiptModal, "_blank")}
            >
              <Download size={18} />
            </button>
          </div>

          <iframe
            src={receiptModal}
            className={styles.receiptFrame}
            title={t("receipt")}
          />

        </div>
      </div>
    );
  };

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

  useEffect(() => {
    const close = () => setOpenActions(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const openAdvanceModal = async (bill) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/advance/fetch/?user_id=${bill.user_id}&month=${bill.month}&year=${bill.year}/`,
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
        month: advanceModal.month || month || new Date().getMonth() + 1,
        year: advanceModal.year || year || new Date().getFullYear(),
        advance_amount: Number(advanceData.amount),
        payment_method: advanceData.payment_method,
        notes: advanceData.notes,
        action: type
      };

      const res = await fetch(`${API_BASE}/api/advance/update/`,
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

    const defaultMessage = `Hello ${bill.name || "Sir/Madam"},

This is to inform you about the mess billing details of your ward:

👤 Student: ${bill.name}
📅 Month: ${bill.month}/${bill.year}

💰 Total Bill: ₹${Number(bill.total_payable || 0).toFixed(2)}
💳 Paid: ₹${Number(bill.paid_amount || 0).toFixed(2)}
⚠️ Pending: ₹${Number(bill.pending_amount || 0).toFixed(2)}

Status: ${bill.has_pending ? "Unpaid" : "Paid"}

Kindly clear the dues at the earliest.

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

  const goToUsers = (user) =>{
   router.push({
  pathname: "/users",
  query: { id: user.user_id }
});
  }
  const getBillAmount = (b) => {
    if (!messAccess?.per_day_rate) {
      const price = (b.monthly_price || "₹0").replace(/[₹,]/g, "");
      return Number(price);
    }
    if (billingType === "daily") {
      return Number(b.days_billed || 0) * Number(b.chosen_per_day_rate || 0);
    }
    if (billingType === "monthly") {
      const price = (b.monthly_price || "₹0").replace(/[₹,]/g, "");
      return Number(price);
    }
    return Number(b.total_amount || 0);
  };


  const openPaymentModal = (bill, isSpecificHistory = false) => {
    let amt = isSpecificHistory ? getBillAmount(bill) : bill.pending_amount || getBillAmount(bill);
    
    setPaymentData({
      amount: Math.max(0, amt),
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
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(`${API_BASE}/api/bills/mark-paid/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(t("paymentRecorded"));
      setPaymentModal(null);
      fetchBills();
    } catch (err) {
      toast.error(err.message || t("somethingWrong"));
    }
  };
  
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeaders = () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
  const downloadAuthHeaders = () => ({ Authorization: `Bearer ${token}` });

  const fetchBills = async () => {
    try {
      setLoading(true);
      const isFiltered = month && year;
      const cacheKey = isFiltered ? `bills-${month}-${year}` : `bills-all`;

      const data = await offlineFetch(cacheKey, async () => {
        const res = await fetch(`${API_BASE}/api/bills/all/`, { headers: authHeaders() });
        if (!res.ok) throw new Error(await res.text());
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

  useAppRefresh(fetchBills);

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

  const userIdFromQuery = router.isReady ? router.query.userId : null;
  
  const groupedBills = (() => {
    const map = {};
    bills.forEach((b) => {
      const key = b.user_id;
      if (!map[key]) {
        map[key] = {
          ...b,
          pending_amount: 0,
          advance_amount: 0,
          payable: 0,
          total_payable: 0,
          has_pending: false,
          history: []
        };
      }

      // ✅ Always ensure parent data is preserved
if (!map[key].parent_mobile && b.parent_mobile) {
  map[key].parent_mobile = b.parent_mobile;
  map[key].parent_name = b.parent_name;
}

      map[key].history.push(b);

      if (b.advance_amount !== null && b.advance_amount !== undefined) {
        map[key].advance_amount = Number(b.advance_amount);
      }

      const amount = getBillAmount(b);
      const paidAmt = Number(b.paid_amount || 0);
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const targetMonth = month ? Number(month) : currentMonth;
      const targetYear = year ? Number(year) : currentYear;

      const isCurrent = Number(b.month) === targetMonth && Number(b.year) === targetYear;

      // if (isCurrent) {
      //   map[key].payable = amount;
      //   map[key].start_date = b.start_date;
      //   map[key].end_date = b.end_date;
      // }

      if (!b.paid) {
        const diff = amount - paidAmt;
        map[key].pending_amount += (diff > 0 ? diff : 0);
        map[key].has_pending = true;
      }
    });

    Object.values(map).forEach((u) => {
      const advance = Number(u.advance_amount || 0);
      u.total_payable = Number(u.payable || 0) + Number(u.pending_amount || 0) - advance;
    });

    return Object.values(map);
  })();

  const paidBills = groupedBills.filter(b => !b.has_pending);
  const unpaidBills = groupedBills.filter(b => b.has_pending);

const exportBillingPDF = async () => {
  try {
    if (!month || !year) return toast.error(t("selectMonthYear"));

    setExportingPDF(true);

    const token = localStorage.getItem("token");

    // ================= FETCH MESS =================
    const messRes = await fetch(`${API_BASE}/api/mess/details/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const mess = await messRes.json();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ================= LOAD LOGO =================
    const loadImageAsBase64 = (url) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
      });

    let logoBase64 = null;
    try {
      logoBase64 = await loadImageAsBase64(mess.logo || "/Assets/logo_Bite_Track.png");
    } catch {
      logoBase64 = await loadImageAsBase64("/Assets/logo_Bite_Track.png");
    }

    // ================= HEADER =================
    doc.setFillColor(0, 113, 112);
    doc.rect(0, 0, pageWidth, 40, "F");

    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 14, 6.5, 30, 30);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(mess.name || "Mess Name", pageWidth - 14, 15, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(mess.location || "", pageWidth - 14, 22, { align: "right" });
    doc.text(mess.email || "", pageWidth - 14, 28, { align: "right" });
    doc.text(String(mess.contact_info || ""), pageWidth - 14, 33, { align: "right" });

    // ✅ Month-Year added clearly
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Billing Month: ${month}/${year}`, pageWidth - 14, 38, {
      align: "right",
    });

    doc.setTextColor(0, 0, 0);

    // ================= TITLE =================
    doc.line(14, 55, pageWidth - 14, 55);
    doc.setFontSize(14);
    doc.text("Billing Report", 14, 50);

    let startY = 60;

    // ================= TABLE STYLE =================
    const commonStyles = {
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: {
        fillColor: [0, 113, 112],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [240, 250, 250] },
    };

    // ================= PAID USERS =================
    doc.setFontSize(13);
    doc.text("Paid Users", 14, startY);

    autoTable(doc, {
      startY: startY + 5,
      ...commonStyles,
      head: [[
        "User",
        "Course / Hostel",
        "Parent",
        "Advance",
        "Paid Amount"
      ]],
      body: paidBills.map(b => [
        `${b.name || "-"}\n${b.email || ""}\n${b.mobile || ""}`,

        `${b.course || "-"}\n${b.hostel_name || "-"}\nRoom: ${b.room_no || "-"}`,

        `${b.parent_name || "-"}\n${b.parent_mobile || "-"}`,

        Number(b.advance_amount || 0).toFixed(2),

       Number(b.paid_amount || 0),
      ])
    });

    // ================= UNPAID USERS =================
    startY = doc.lastAutoTable.finalY + 12;

    doc.setFontSize(13);
    doc.text("Unpaid Users", 14, startY);

    autoTable(doc, {
      startY: startY + 5,
      ...commonStyles,
      head: [[
        "User",
        "Course / Hostel",
        "Parent",
        "Advance",
        "Total Payable"
      ]],
      body: unpaidBills.map(b => [
        `${b.name || "-"}\n${b.email || ""}\n${b.mobile || ""}`,

        `${b.course || "-"}\n${b.hostel_name || "-"}\nRoom: ${b.room_no || "-"}`,

        `${b.parent_name || "-"}\n${b.parent_mobile || "-"}`,

        Number(b.advance_amount || 0).toFixed(2),
        Number(b.total_payable || 0).toFixed(2),

        

//   (() => {
//   const total_payable = Math.max(
//     0,
//     Number(b.total_amount || 0) -
//     Number(b.paid_amount || 0) -
//     Number(b.advance_amount || 0)
//   );

//   return total_payable.toFixed(2);
// })()
      ])
    });

    // ================= SAVE =================
    const fileName = `${mess.name?.replace(/\s+/g, "_") || "Billing"}_${month}_${year}.pdf`;

    await saveJsPdfDocument(doc, fileName);

  } catch (err) {
    console.error(err);
    toast.error(t("somethingWentWrong"));
  } finally {
    setExportingPDF(false);
  }
};

  const filtered = groupedBills.filter((b) => {
    if (userIdFromQuery && String(b.user_id) !== String(userIdFromQuery)) return false;
    if (statusFilter !== "all") {
      if (statusFilter === "paid" && b.has_pending) return false;
      if (statusFilter === "unpaid" && !b.has_pending) return false;
    }
    if (!search) return true;
    return `${b.name || ""} ${b.email || ""} ${b.mobile || ""}`.toLowerCase().includes(search.toLowerCase());
  });

  const downloadExcel = async () => {
    if (!month || !year) return toast(t("selectMonthYear"));

    try {
      await downloadFileFromUrl(
        `${API_BASE}/api/bills/download/?month=${month}&year=${year}`,
        {
          fileName: `Billing_${month}_${year}.xlsx`,
          headers: downloadAuthHeaders(),
        }
      );
    } catch (error) {
      console.error(error);
      toast.error(t("somethingWentWrong"));
    }
  };

  const { t } = useLanguage();
  const monthOptions = [
    { value: "", label: t("selectMonth") },
    ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString().padStart(2, "0"), label: new Date(0, i).toLocaleString("default", { month: "long" }) }))
  ];

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{t("billing")}</h1>

          <div className={styles.tabs}>
            <button className={`${styles.tabBtn} ${activeTab === "bills" ? styles.activeTab : ""}`} onClick={() => setActiveTab("bills")}> {t("allBills")} </button>
            <button className={`${styles.tabBtn} ${activeTab === "payments" ? styles.activeTab : ""}`} onClick={() => setActiveTab("payments")}> {t("paymentHistory")} </button>
            <div className={styles.tabIndicator} style={{ transform: activeTab === "bills" ? "translateX(0%)" : "translateX(100%)" }} />
          </div>

          {activeTab === "bills" && (
            <>
              <div className={styles.filterHeader}>
                <button onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? t("hideFilters") : t("showFilters")}
                  <Filter size={16} style={{ marginLeft: "6px" }} />
                </button>
                <button onClick={() => router.push("/billing/analytics")}>
                  {t("viewAnalytics")}
                  < ChartBarIcon size={16} style={{ marginLeft: "6px" }} />
                </button>
              </div>

              {showFilters && (
                <div className={styles.controls}>
                  <div className={styles.controlItem}>
                    <label>{t("month")}</label>
                    <DayDropdown options={monthOptions} value={month} onChange={setMonth} />
                  </div>
                  <div className={styles.controlItem}>
                    <label>{t("year")}</label>
                    <input type="number" placeholder={t("yearPlaceholder")} value={year} onChange={(e) => setYear(e.target.value)} />
                  </div>
                  <div className={styles.controlItem}>
                    <label>{t("payment")}</label>
                    <DayDropdown options={["all", "paid", "unpaid"]} value={statusFilter} onChange={setStatusFilter} />
                  </div>
                  {messAccess?.per_day_rate && (
                    <div className={styles.controlItem}>
                      <label>{t("billingType")}</label>
                      <DayDropdown options={[{ value: "daily", label: t("dailyBilling") }, { value: "monthly", label: t("monthlyBilling") }]} value={billingType} onChange={setBillingType} />
                    </div>
                  )}
                </div>
              )}

              <br></br>
                  <div className={styles.controlItem}>
                    <input placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
              <div className={styles.controlItemActions}>
                <button className={styles.btnPrimary} style={{ display:"flex",gap:"16px"}} onClick={fetchBills}><RefreshCcw size={13}/> {t("refresh")}</button>
                <button className={styles.btnSecondary} style={{ display:"flex",gap:"16px"}} onClick={exportBillingPDF} disabled={exportingPDF}>{exportingPDF ? t("exporting") :( <><DownloadIcon size={13}/> {t("PDF")} </>) }</button>
                <button className={`${styles.btnSecondary}`} style={{ display:"flex",gap:"16px"}} onClick={downloadExcel} disabled={!isMonthYearSelected}>  <DownloadIcon size={13}/>{t("Excel")} </button>
              </div>

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
                            <th>{t("hostel")}</th>
                            <th>{t("parents")}</th>
                            {isMonthYearSelected && <th>{t("duration")}</th>}
                            {messAccess?.per_day_rate && <th>{t("days")}</th>}
                            <th>{t("advance")}</th>
                            <th>{t("pending")}</th>
                            <th>{t("totalPayable")}</th>
                            <th>{t("paymentStatus")}</th>
                            {/* <th>{t("actions")}</th>   */}
                             </tr> 
                        </thead>
                        <tbody>
                          {filtered.map((b, idx) => (
                            <React.Fragment key={b.user_id}>
                            <tr style={{ background: expandedCard === b.user_id ? "#f3f4f6" : "transparent" }}>
                              <td>{idx + 1}</td>
                              <td>
                                <strong onClick={()=> goToUsers(b)}>{b.name || b.user_name || "-"}</strong><br />
                                <span style={{ fontSize: "12px", color: "#6b7280" }}>{b.email || "-"}</span><br />
                                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                    <a href={`tel:${b.mobile}`} style={{ color: "black", textDecoration: "none" }}>{b.mobile || "-"}</a>
                                </span>
                              </td>
                              <td>
                                {b.course || "-"}<br/>
                                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                  {b.hostel_name || "-"}
                                  <br/>
                                  Room {b.room_no || "-"}
                                </span>
                              </td>
                              <td>
                                {b.parent_name || "-"}<br/>
                                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                  <a href={`tel:${b.parent_mobile}`} style={{ color: "black", textDecoration: "none" }}>{b.parent_mobile || "-"}</a>
                                </span>
                              </td>

                              {isMonthYearSelected && <td>{b.start_date || "-"} {t("to")} {b.end_date || "-"}</td>}
                              {messAccess?.per_day_rate && <td>{b.days_billed}</td>}

                              <td>{Number(b.advance_amount || 0).toFixed(2)}</td>
                              <td>{Number(b.pending_amount || 0).toFixed(2)}</td>
                              <td>{Number(b.total_payable).toFixed(2)}</td>
                              {/* <td>{b.has_pending ? t("pending") : t("clear")}</td> */}
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span
                                    className={`${styles.statusBadge} ${
                                      b.has_pending ? styles.statusUnpaid : styles.statusPaid
                                    }`}
                                  >
                                    {b.has_pending ? "Unpaid" : "Paid"}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={expandedCard === b.user_id ? "Collapse payment history" : "Expand payment history"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedCard(expandedCard === b.user_id ? null : b.user_id);
                                    }}
                                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0", display: "inline-flex", alignItems: "center", color: "#0f766e" }}
                                  >
                                    <ChevronDown size={16} style={{ transform: expandedCard === b.user_id ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }} />
                                  </button>
                                </div>
                              </td>
  

                              {/* <td className={styles.actionsCell}>
                                <div className={styles.actionMenuWrapper}>
                                  <button className={styles.btnMore} onClick={(e) => { e.stopPropagation(); setOpenActions(openActions === b.user_id ? null : b.user_id); }}>
                                    {t("clickHere")}
                                  </button>
                                  {openActions === b.user_id && (
                                    <div className={styles.actionDropdown} onClick={(e) => e.stopPropagation()}>
                                      <button className={`${!b.has_pending ? styles.btnPaidDisabled : styles.btnPaid}`} disabled={!b.has_pending} onClick={() => { if(b.has_pending) openPaymentModal(b); }}>
                                        {!b.has_pending ? t("paid") : t("markPaid")}
                                      </button>
                                      <button onClick={() => { setSelectedAttendance({ year: b.year, month: b.month, attendanceMap: b.attendance_map, name: b.name }); setOpenActions(null); }}>{t("viewCalendar")}</button>
                                      <button onClick={() => { setExpandedCard(expandedCard === b.user_id ? null : b.user_id); setOpenActions(null); }}>
                                        {expandedCard === b.user_id ? t("closeHistory") : t("paymentHistory")}
                                      </button>
                                      <button onClick={() => { openAdvanceModal(b); setOpenActions(null); }}>{t("addAdvance")}</button>
                                      <button onClick={() => { openWhatsAppDrawer(b); setOpenActions(null); }}>{t("sendMessage")}</button>
                                    </div>
                                  )}
                                </div>
                              </td> */}
                            </tr>
                            {expandedCard === b.user_id && (
                              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                                <td colSpan="13" style={{ padding: "0" }}>
                                  <div style={{ padding: "16px 24px" }}>
                                    <strong style={{ display: "block", marginBottom: "12px", fontSize: "15px", color: "#111827" }}>{t("paymentHistory")}</strong>
                                    <table style={{ width: "100%", background: "white", borderRadius: "8px", borderCollapse: "collapse", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                      <thead>
                                        <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                                          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("month")}</th>
                                          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("duration")}</th>
                                          <th style={{ padding: "10px", textAlign: "right", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("amount")}</th>
                                          <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("status")}</th>
                                          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("note")}</th>
                                          <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("actions")}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {b.history.sort((a, y) => { if (a.year === y.year) return y.month - a.month; return y.year - a.year }).map(h => (
                                          <tr key={`${h.user_id}-${h.year}-${h.month}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                            <td style={{ padding: "10px", fontWeight: "500", color: "#111827", fontSize: "14px" }}>{h.month}/{h.year}</td>
                                            <td style={{ padding: "10px", color: "#6b7280", fontSize: "13px" }}>{h.start_date || "-"} {t("to")} <br></br>  
                                            {h.end_date || "-"}</td>
                                            <td style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: "#111827" }}>
                                              ₹{getBillAmount(h).toFixed(2)}<br/>
                                              <span style={{ fontSize: "12px", color: h.paid ? "#10b981" : "#6b7280" }}>Paid: ₹{Number(h.paid_amount || 0).toFixed(2)}</span>
                                            </td>
                                            <td style={{ padding: "10px", textAlign: "center" }}>
                                              <span
  className={`${styles.statusBadge} ${
    h.paid ? styles.statusPaid : styles.statusUnpaid
  }`}
>
  {h.paid ? "Paid" : "Unpaid"}
</span>
                                            </td>
                                            <td style={{ padding: "10px", color: "#6b7280", fontSize: "13px", maxWidth: "150px" }}>
                                              {h.note || "-"}
                                            </td>
                                            <td style={{ padding: "10px", textAlign: "center", display: "flex", gap: "6px", justifyContent: "center" }}>
                                              <button onClick={() => openPaymentModal(h, true)} style={{ padding: "6px 14px", background: h.paid ? "#f3f4f6" : "#007171", color: h.paid ? "black" : "white", border: "1px solid", borderColor: h.paid ? "#d1d5db" : "transparent", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "0.2s" }} onMouseOver={(e) => {if(!h.paid) e.currentTarget.style.background = "#007170"}} onMouseOut={(e) => {if(!h.paid) e.currentTarget.style.background = "#007171"}}>
                                                {h.paid ? (t("editPaidAmount") || "Edit Paid Amount") : t("markPaid")}
                                              </button>
                                              <button onClick={() => setSelectedAttendance({ year: h.year, month: h.month, attendanceMap: h.attendance_map || {}, name: h.name, ownerMarkedDates: h.owner_marked_dates || [] })} style={{ padding: "6px 14px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#f3f4f6"} onMouseOut={(e) => e.currentTarget.style.background = "white"}>
                                                {t("viewCalendar")}
                                              </button>
                                              <button onClick={() => openAdvanceModal(b)} style={{ padding: "6px 14px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#f3f4f6"} onMouseOut={(e) => e.currentTarget.style.background = "white"}>
                                                {t("addAdvance")}
                                              </button>
                                              <button onClick={() => openWhatsAppDrawer(b)} style={{ padding: "6px 14px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "#f3f4f6"} onMouseOut={(e) => e.currentTarget.style.background = "white"}>
                                                {t("sendWhatsApp")}
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.mobileList}>
                      {filtered.map((b, idx) => (
                        <div key={b.user_id || idx} className={styles.mobileCard}>
                          <div className={styles.cardHeader}>
                            <div className={styles.headerLeft}>
                              <strong className={styles.mbcard}>
                                {idx + 1} - {b.name} <span
    className={`${styles.statusBadge} ${
      b.has_pending ? styles.statusUnpaid : styles.statusPaid
    }`}
  >
    {b.has_pending ? "Unpaid" : "Paid"}
  </span>
                                </strong>
                              <span style={{ fontSize: "13px", color: "#6b7280", display: "inline-block" }}>
                                <TooltipText value={b.email || "-"} />
                              </span>
                              <span style={{ fontSize: "13px", color: "#6b7280", display: "flex", flexDirection:"row", justifyContent:"space-between"}}>
                                <a href={`tel:${b.mobile}`} style={{ color: "black", textDecoration: "none" }}>
                                  <TooltipText value={b.mobile || "-"} />
                                </a>
                              <div>

                                {/* <button className={styles.btnAdvance} onClick={(e) => { e.stopPropagation(); openAdvanceModal(b); }}><FaMoneyBillWave size={20} /></button>
                                <button className={styles.inlineWhatsapp} onClick={(e) => { e.stopPropagation(); openWhatsAppDrawer(b); }}><FaWhatsapp size={20} color="#25D366" /></button> */}
                              
                              </div>
                              </span>
                            </div>
                            <button onClick={() => setExpandedCard(expandedCard === b.user_id ? null : b.user_id)}>
                              <ChevronDown size={20} style={{ transform: expandedCard === b.user_id ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }} />
                            </button>
                          </div>

                          

                          {expandedCard === b.user_id && (
                            <div className={styles.cardBody} style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px", marginTop: "4px" }}>
                              <div className={styles.cardRow}>
                                <span>{t("roomNo")}</span>
                                <strong>{b.room_no || "-"}</strong>
                              </div>
                              <div className={styles.cardRow}>
                                <span>{t("hostel")}</span>
                                <strong>{b.hostel_name || "-"}</strong>
                              </div>
                              <div className={styles.cardRow}>
                                <span>{t("course")}</span>
                                <strong>{b.course || "-"}</strong>
                              </div>
                              
                              <div style={{ marginTop: "12px" }}>
                                <span style={{ fontSize: "13px", color: "#6b7280" }}>{t("parents")}</span><br/>
                                <strong>
                                  <TooltipText value={b.parent_name || "-"} />
                                  {" - "}
                                  <a href={`tel:${b.parent_mobile}`} style={{ color: "black", textDecoration: "none" }}>
                                    <TooltipText value={b.parent_mobile || "-"} />
                                  </a>
                                </strong>
                              </div>

                              <hr style={{ margin: "16px 0", borderColor: "#f3f4f6" }} />

                              <div className={styles.cardRow}><span>{t("advance")}</span><strong><TooltipText value={`₹${Number(b.advance_amount || 0).toFixed(2)}`} /></strong></div>
                              <div className={styles.cardRow}><span>{t("pending")}</span><strong><TooltipText value={`₹${Number(b.pending_amount || 0).toFixed(2)}`} /></strong></div>
                              <div className={styles.cardRow}><span>{t("totalPayable")}</span><strong><TooltipText value={`₹${Number(b.total_payable).toFixed(2)}`} /></strong></div>
                              

                              <div className={styles.mobileHistory} style={{ marginTop: "16px", background: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                                <strong style={{ display: "block", marginBottom: "8px", fontSize: "14px" }}>{t("paymentHistory")}</strong>
                                {b.history.sort((a, y) => { if(a.year === y.year) return y.month - a.month; return y.year - a.year }).map(h => (
                                  <div key={`${h.user_id}-${h.year}-${h.month}`} style={{ background: "white", padding: "12px", marginBottom: "8px", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                      <span style={{ fontSize: "14px", fontWeight: "600" }}><TooltipText value={`${h.month}/${h.year}`} /></span>
                                      <div style={{ textAlign: "right" }}>
                                        <span style={{ color: "#111827", fontWeight: "600" }}><TooltipText value={`₹${getBillAmount(h).toFixed(2)}`} /></span><br/>
                                        <span style={{ fontSize: "12px", color: h.paid ? "#10b981" : "#6b7280" }}><TooltipText value={`Paid: ₹${Number(h.paid_amount || 0).toFixed(2)}`} /></span>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "8px", alignItems: "flex-end" }}>
                                      <span><TooltipText value={`${h.start_date || "-"} ${t("to")} ${h.end_date || "-"}`} /></span>
                                      <span
  className={`${styles.statusBadge} ${
    h.paid ? styles.statusPaid : styles.statusUnpaid
  }`}
  title={h.paid ? "Paid" : "Unpaid"}
>
  {h.paid ? "Paid" : "Unpaid"}
</span>
                                    </div>
                                    {h.note && (
                                      <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "12px", fontStyle: "italic", padding: "8px", background: "#f9fafb", borderRadius: "4px", border: "1px solid #f3f4f6" }}>
                                        <TooltipText value={h.note} />
                                      </div>
                                    )}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                      <button 
                                        onClick={() => openPaymentModal(h, true)}
                                        style={{ flex: "1 1 calc(50% - 3px)", padding: "8px", background: h.paid ? "#f3f4f6" : "#007171", color: h.paid ? "black" : "white", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                                        {h.paid ? (t("editPaidAmount") || "Edit Paid Amount") : t("markPaid")}
                                      </button>
                                      <button 
                                        onClick={() => setSelectedAttendance({ year: h.year, month: h.month, attendanceMap: h.attendance_map || {}, name: h.name, ownerMarkedDates: h.owner_marked_dates || [] })}
                                        style={{ flex: "1 1 calc(50% - 3px)", padding: "8px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                                        {t("viewCalendar")}
                                      </button>
                                      <button 
                                        onClick={() => openAdvanceModal(b)}
                                        style={{ flex: "1 1 calc(50% - 3px)", padding: "8px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                                        {t("addAdvance")}
                                      </button>
                                      <button 
                                        onClick={() => openWhatsAppDrawer(b)}
                                        style={{ flex: "1 1 calc(50% - 3px)", padding: "8px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
                                        {t("sendWhatsApp")}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {paymentModal && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalContent}>
                    <h3>{paymentModal.paid ? (t("editPayment") || "Edit Payment") : t("markPayment")} — {paymentModal.name || paymentModal.user_name} ({paymentModal.month}/{paymentModal.year})</h3>
                    <div className={styles.formGroup}>
                      <label>{t("amount")}</label>
                      <input type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t("paymentType")}</label>
                      <select value={paymentData.payment_type} onChange={(e) => setPaymentData({ ...paymentData, payment_type: e.target.value })}>
                        <option value="monthly">{t("monthly")}</option>
                        <option value="daily">{t("daily")}</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t("paymentMethod")}</label>
                      <select value={paymentData.payment_method} onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}>
                        <option value="">{t("selectMethod")}</option>
                        <option value="Cash">{t("cash")}</option>
                        <option value="UPI">{t("uPI")}</option>
                      </select>
                    </div>
                    {paymentData.payment_method === "UPI" && (
                      <div className={styles.formGroup}>
                        <label>{t("upiId")}</label>
                        <input type="text" value={paymentData.upi_id} onChange={(e) => setPaymentData({ ...paymentData, upi_id: e.target.value })} />
                      </div>
                    )}
                    <div className={styles.formGroup}>
                      <label>{t("transactionId")}</label>
                      <input type="text" value={paymentData.transaction_id} onChange={(e) => setPaymentData({ ...paymentData, transaction_id: e.target.value })} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t("paymentDate")}</label>
                      <input type="date" value={paymentData.payment_date} onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t("note")}</label>
                      <textarea rows={3} placeholder={t("notePlaceholder") || "Optional note"} value={paymentData.note} onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })} />
                    </div>
                    <div className={styles.modalActions}>
                      <button className={styles.btnPrimary} onClick={submitPayment}>{t("submit")}</button>
                      <button className={styles.btnSecondary} onClick={() => setPaymentModal(null)}>{t("cancel")}</button>
                    </div>
                  </div>
                </div>
              )}

              {selectedAttendance && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalContent}>
                    <div className={styles.modalHeader}>
                      <h3>{selectedAttendance.name}{t("attendanceSuffix")} ({selectedAttendance.month}/{selectedAttendance.year})</h3>
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

          {activeTab === "payments" && <PaymentHistory token={token} />}

          {waDrawer && (
            <div className={styles.waOverlay} onClick={closeWhatsAppDrawer}>
              <div className={styles.waModal} onClick={(e) => e.stopPropagation()}>
                <h3>{t("sendWhatsApp")}</h3>
                <div className={styles.waUser}><strong>{waDrawer.name}</strong></div>
                <textarea className={styles.waTextarea} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} />
                <div className={styles.waButtons}>
                  <button className={styles.waOption} onClick={() => sendWhatsApp(waDrawer.mobile)}>{waDrawer.name} ({waDrawer.mobile})</button>
                  {waDrawer.parent_mobile ? (
  <button
    className={styles.waOption}
    onClick={() => sendWhatsApp(waDrawer.parent_mobile)}
  >
    {waDrawer.parent_name || "Parent"} ({waDrawer.parent_mobile})
  </button>
) : (
  <span style={{ fontSize: "12px", color: "#9ca3af" }}>
    Parent number not available
  </span>
)}
                  <button className={styles.waCancel} onClick={closeWhatsAppDrawer}>{t("cancel")}</button>
                </div>
              </div>
            </div>
          )}

          {advanceModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalContent}>
                <h3>{t("advancePayment")} — {advanceModal.name}</h3>
                {existingAdvance && <div className={styles.advanceBalance}>{t("currentBalance")}: ₹{existingAdvance.advance_amount}</div>}
                <div className={styles.formGroup}>
                  <label>{t("amount")}</label>
                  <input type="number" value={advanceData.amount} onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>{t("paymentMethod")}</label>
                  <select value={advanceData.payment_method} onChange={(e) => setAdvanceData({ ...advanceData, payment_method: e.target.value })}>
                    <option value="">{t("select")}</option>
                    <option value="Cash">{t("cash") || "Cash"}</option>
                    <option value="UPI">{t("uPI")}</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{t("notes")}</label>
                  <textarea rows={3} value={advanceData.notes} onChange={(e) => setAdvanceData({ ...advanceData, notes: e.target.value })} />
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnPrimary} onClick={() => submitAdvance("add")}>+{t("addAdvance")}</button>
                  <button className={styles.btnDanger} onClick={() => submitAdvance("minus")}>− {t("deduct")}</button>
                  <button className={styles.btnSecondary} onClick={() => setAdvanceModal(null)}>{t("cancel")}</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <ReceiptModal />
    </Layout>
  );
}
