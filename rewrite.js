const fs = require('fs');

const code = `import React, { useEffect, useState } from "react";
import { API_BASE } from "../../lib/api";
import { useAppRefresh } from "@/lib/useAppRefresh";
import Layout from "../../components/Layout";
import AttendanceCalendar from "../../components/AttedanceCalendar";
import styles from "../../styles/billing.module.css";
import PaymentHistory from "../paymentHistory";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { FaWhatsapp, FaMoneyBillWave } from "react-icons/fa";
import { useRouter } from "next/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { ChartBarIcon, ChevronDown, ChevronRight, Filter } from "lucide-react";
import DayDropdown from "../../components/DayDropdown";

export default function BillsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("bills");
  const [billingType, setBillingType] = useState("monthly");
  
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: "", payment_type: "monthly", payment_method: "", upi_id: "", transaction_id: "", payment_date: new Date().toISOString().slice(0, 10), note: ""
  });

  const [advanceModal, setAdvanceModal] = useState(null);
  const [advanceData, setAdvanceData] = useState({ amount: "", payment_method: "", notes: "" });

  const [waDrawer, setWaDrawer] = useState(null);
  const [waMessage, setWaMessage] = useState("");
  const [exportingPDF, setExportingPDF] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeaders = () => ({ Authorization: \`Bearer \${token}\`, "Content-Type": "application/json" });

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await offlineFetch("bills-all", async () => {
        const res = await fetch(\`/api/bills/all/\`, { headers: authHeaders() });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(t("tryAgain") || "Error loading");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBills(); }, []);
  useAppRefresh(fetchBills);

  const toggleUserExpanded = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const isPerDayRateEnabled = users.some(u => Boolean(Number(u.per_day_rate)));

  const filteredUsers = users.map(u => {
    const recalculatedMonths = (u.months || []).map(m => {
      let tAmount = Number(m.total_amount || 0);

      if (!u.per_day_rate || u.per_day_rate === "0") {
        tAmount = Number((u.monthly_price || "0").replace(/[₹,]/g, "")) || 0;
      } else if (billingType === "daily") {
        tAmount = Number(m.days_billed || 0) * Number(u.per_day_rate || 0);
      } else if (billingType === "monthly") {
        tAmount = Number((u.monthly_price || "0").replace(/[₹,]/g, "")) || 0;
      }

      const fAmount = tAmount - Number(m.advance_amount || 0);
      
      return {
        ...m,
        total_amount: tAmount,
        final_amount: fAmount
      };
    });

    const filteredMonths = recalculatedMonths.filter(m => {
      if (month && m.month !== Number(month)) return false;
      if (year && m.year !== Number(year)) return false;
      if (statusFilter === "paid" && !m.paid) return false;
      if (statusFilter === "unpaid" && m.paid) return false;
      return true;
    });
    return { ...u, filteredMonths };
  }).filter(u => {
    if (search) {
      const q = search.toLowerCase();
      const match = (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.mobile || "").includes(q);
      if (!match) return false;
    }
    const isFiltered = month || year || statusFilter !== "all";
    if (isFiltered && u.filteredMonths.length === 0) return false;
    return true;
  });

  const openPaymentModal = (user, monthObj) => {
    const amountToPay = monthObj.paid ? monthObj.paid_amount : monthObj.final_amount;
    setPaymentData({
      amount: Math.max(0, amountToPay),
      payment_type: "monthly", payment_method: "", upi_id: "", transaction_id: "",
      payment_date: new Date().toISOString().slice(0, 10),
      note: monthObj.note || "",
    });
    setPaymentModal({ user, monthObj });
  };

  const submitPayment = async () => {
    if (!paymentModal) return;
    if (!paymentData.amount || Number(paymentData.amount) <= 0) return toast.error(t("enterValidAmount"));
    if (!paymentData.payment_method) return toast.error(t("selectPaymentMethod"));

    let transactionId = paymentData.transaction_id;
    if (paymentData.payment_method === "Cash") {
      const now = new Date();
      transactionId = \`CASH-\${now.getTime()}\`;
    }

    const payload = {
      user_id: paymentModal.user.user_id,
      month: paymentModal.monthObj.month,
      year: paymentModal.monthObj.year,
      amount: Number(paymentData.amount),
      payment_date: paymentData.payment_date,
      payment_type: paymentData.payment_type,
      payment_method: paymentData.payment_method,
      transaction_id: transactionId,
      upi_id: paymentData.upi_id || null,
      note: paymentData.note?.trim() || null
    };

    try {
      const res = await fetch(\`\${API_BASE}/api/bills/mark-paid/\`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("paymentRecorded"));
      setPaymentModal(null);
      fetchBills();
    } catch (err) {
      toast.error(err.message || t("somethingWrong"));
    }
  };

  const openAdvanceModal = (user) => {
    setAdvanceData({ amount: "", payment_method: "", notes: "" });
    setAdvanceModal({ user_id: user.user_id || user.id, name: user.name });
  };

  const submitAdvance = async (type = "add") => {
    if (!advanceData.amount) return toast.error(t("enterAmount"));
    try {
      const payload = {
        user_id: advanceModal.user_id, advance_amount: Number(advanceData.amount), payment_method: advanceData.payment_method, notes: advanceData.notes, action: type,
        month: new Date().getMonth() + 1, year: new Date().getFullYear()
      };
      const res = await fetch(\`\${API_BASE}/api/advance/update/\`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("advanceUpdated"));
      setAdvanceModal(null);
      fetchBills();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openWhatsAppDrawer = (mobile, name) => {
    setWaMessage(\`Hello \${name},\n\nPlease review your recent mess bill status.\n\nThank you.\`);
    setWaDrawer({ mobile, name });
  };

  const sendWhatsApp = (mobile) => {
    if (!mobile) return toast.error(t("mobileNotFound"));
    const formattedNumber = mobile.replace(/\\D/g, "");
    window.open(\`https://wa.me/\${formattedNumber}?text=\${encodeURIComponent(waMessage)}\`, "_blank");
    setWaDrawer(null);
  };

  const downloadExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Billing");
      sheet.addRow(["Name", "Email", "Mobile", "Course", "Hostel", "Room", "Parent", "Parent Contact", "Month", "Year", "Total", "Advance", "Final Payable", "Status", "Note"]);

      filteredUsers.forEach(u => {
        u.filteredMonths.forEach(m => {
          sheet.addRow([ u.name || "-", u.email || "-", u.mobile || "-", u.course || "-", u.hostel_name || "-", u.room_no || "-", u.parent_name || "-", u.parent_mobile || "-", m.month, m.year, m.total_amount, m.advance_amount, Number(m.final_amount).toFixed(2), m.paid ? "Paid" : "Pending", m.note || "-" ]);
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = \`Billing_Report.xlsx\`; a.click();
      window.URL.revokeObjectURL(url);
    } catch(err) {
      toast.error("Failed to export Excel");
    }
  };

  const exportBillingPDF = async () => {
    try {
      setExportingPDF(true);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(0, 113, 112);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text("Billing Report", pageWidth - 14, 25, { align: "right" });
      doc.setTextColor(0, 0, 0);

      const rows = [];
      filteredUsers.forEach(u => {
        u.filteredMonths.forEach(m => {
          rows.push([ u.name || "-", \`\${m.month}/\${m.year}\`, m.total_amount, m.advance_amount, Number(m.final_amount).toFixed(2), m.paid ? "Paid" : "Pending" ]);
        });
      });

      autoTable(doc, { startY: 50, head: [["Name", "Month/Year", "Total", "Advance", "Payable", "Status"]], body: rows });
      doc.save("Billing_Report.pdf");
    } finally {
      setExportingPDF(false);
    }
  };

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
            <button className={\`\${styles.tabBtn} \${activeTab === "bills" ? styles.activeTab : ""}\`} onClick={() => setActiveTab("bills")}>
              {t("allBills")}
            </button>
            <button className={\`\${styles.tabBtn} \${activeTab === "payments" ? styles.activeTab : ""}\`} onClick={() => setActiveTab("payments")}>
              {t("paymentHistory")}
            </button>
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
                  <ChartBarIcon size={16} style={{ marginLeft: "6px" }} />
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
                  {isPerDayRateEnabled && (
                    <div className={styles.controlItem}>
                      <label>{t("billingType") || "Billing Type"}</label>
                      <DayDropdown 
                        options={[{value: "monthly", label: "Monthly"}, {value: "daily", label: "Daily"}]} 
                        value={billingType} 
                        onChange={setBillingType} 
                      />
                    </div>
                  )}
                  <div className={styles.controlItem}>
                    <label>{t("search")}</label>
                    <input placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className={styles.controlItemActions}>
                    <button className={styles.btnPrimary} onClick={fetchBills}>{t("refresh")}</button>
                    <button className={styles.btnSecondary} onClick={exportBillingPDF} disabled={exportingPDF}>{t("exportPdf")}</button>
                    <button className={styles.btnSecondary} onClick={downloadExcel}>{t("downloadExcel")}</button>
                  </div>
                </div>
              )}

              <section style={{ marginTop: 20 }}>
                {loading ? (
                  <div className={styles.loading}>{t("loading")}</div>
                ) : filteredUsers.length === 0 ? (
                  <div className={styles.empty}>{t("noBillsFound")}</div>
                ) : (
                  <>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ width: 40, textAlign: "center" }}>#</th>
                            <th>{t("user")}</th>
                            <th>{t("hostel")}</th>
                            <th>{t("parents")}</th>
                            <th>{t("advance")}</th>
                            <th style={{ width: 40, textAlign: "center" }}></th>
                            <th style={{ textAlign: "right", paddingRight: "16px" }}>{t("actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u, idx) => (
                            <React.Fragment key={u.user_id || u.id}>
                              <tr className={styles.userRow} style={{ background: expandedUsers.has(u.user_id) ? "#f9fafb" : "white" }}>
                                <td style={{ textAlign: "center", color: "#6b7280" }}>{idx + 1}</td>
                                <td>
                                  <strong>{u.name || "-"}</strong><br />
                                  <span style={{ fontSize: "0.85em", color: "#6b7280" }}>{u.email}</span><br />
                                  <span style={{ fontSize: "0.85em", color: "#6b7280" }}>{u.mobile}</span>
                                </td>
                                <td>
                                  {u.course || "-"}<br />
                                  <span style={{ fontSize: "0.85em", color: "#6b7280" }}>{u.hostel_name || "-"} (Room {u.room_no || "-"})</span>
                                </td>
                                <td>
                                  {u.parent_name ? <strong>{u.parent_name}</strong> : "-"}<br />
                                  <span style={{ fontSize: "0.85em", color: "#6b7280" }}>{u.parent_mobile || "-"}</span>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600, color: (u.months?.[0]?.advance_amount > 0) ? "#047857" : "#374151" }}>
                                    ₹{Number(u.months?.[0]?.advance_amount || 0).toFixed(2)}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button onClick={() => toggleUserExpanded(u.user_id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px" }}>
                                    <ChevronRight size={20} style={{ color: "#4b5563", transform: expandedUsers.has(u.user_id) ? "rotate(90deg)" : "rotate(0deg)", transition: "0.2s" }} />
                                  </button>
                                </td>
                                <td style={{ textAlign: "right", paddingRight: "16px" }}>
                                  <button onClick={() => openAdvanceModal(u)} className={styles.btnSecondary} style={{ padding: "4px 8px", marginRight: 8, fontSize: "0.85em" }}>
                                    + {t("advance")}
                                  </button>
                                  <button onClick={() => openWhatsAppDrawer(u.mobile, u.name)} className={styles.btnSecondary} style={{ padding: "4px 8px" }}>
                                    <FaWhatsapp color="#25D366" size={14} />
                                  </button>
                                </td>
                              </tr>
                              {expandedUsers.has(u.user_id) && (
                                <tr>
                                  <td colSpan={7} style={{ padding: 0, borderBottom: "1px solid #e5e7eb" }}>
                                    <div style={{ padding: "12px 24px", background: "#f3f4f6", borderLeft: "4px solid #10b981" }}>
                                      <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#4b5563" }}>{t("billingHistory")}</h4>
                                      {u.filteredMonths.length === 0 ? (
                                        <p style={{ fontSize: 13, color: "#6b7280" }}>No history for current filters.</p>
                                      ) : (
                                        <table className={styles.table} style={{ background: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                                          <thead style={{ background: "#f9fafb" }}>
                                            <tr>
                                              <th style={{ padding: "8px 12px" }}>{t("month")}</th>
                                              <th style={{ padding: "8px 12px" }}>{t("total")}</th>
                                              <th style={{ padding: "8px 12px" }}>{t("advance")}</th>
                                              <th style={{ padding: "8px 12px" }}>{t("finalPayable")}</th>
                                              <th style={{ padding: "8px 12px" }}>{t("status")}</th>
                                              <th style={{ padding: "8px 12px" }}>{t("actions")}</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {u.filteredMonths.map(m => (
                                              <tr key={\`\${m.year}-\${m.month}\`}>
                                                <td style={{ padding: "8px 12px", color: m.paid ? "#6b7280" : "inherit" }}>{m.month}/{m.year}</td>
                                                <td style={{ padding: "8px 12px", color: m.paid ? "#6b7280" : "inherit" }}>₹{Number(m.total_amount).toFixed(2)}</td>
                                                <td style={{ padding: "8px 12px", color: m.paid ? "#6b7280" : "inherit" }}>₹{Number(m.advance_amount).toFixed(2)}</td>
                                                <td style={{ padding: "8px 12px", fontWeight: 600, color: m.paid ? "#6b7280" : "inherit" }}>₹{Number(m.final_amount).toFixed(2)}</td>
                                                <td style={{ padding: "8px 12px" }}>
                                                  {m.paid ? <span style={{ color: "#047857", fontWeight: 600, background: "#d1fae5", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>{t("paid")}</span> : <span style={{ color: "#b91c1c", fontWeight: 600, background: "#fee2e2", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>{t("pending")}</span>}
                                                </td>
                                                <td style={{ padding: "8px 12px" }}>
                                                  <button 
                                                    className={\`\${styles.btnAction} \${m.paid ? styles.btnSecondary : styles.btnPrimary}\`}
                                                    style={{ padding: "4px 10px", fontSize: 12, background: m.paid ? "#f3f4f6" : undefined, color: m.paid ? "#374151" : undefined }}
                                                    onClick={() => openPaymentModal(u, m)}
                                                  >
                                                    {m.paid ? t("editPayment") || "Edit Payment" : t("markPaid")}
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
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
                      {filteredUsers.map((u, idx) => (
                        <div key={u.user_id} className={styles.mobileCard}>
                          <div className={styles.cardHeader}>
                            <div className={styles.headerLeft}>
                              <strong>{idx + 1}. {u.name}</strong>
                              <div>
                                <button className={styles.btnAdvance} onClick={(e) => { e.stopPropagation(); openAdvanceModal(u); }}><FaMoneyBillWave size={16} /></button>
                                <button className={styles.inlineWhatsapp} onClick={(e) => { e.stopPropagation(); openWhatsAppDrawer(u.mobile, u.name); }}><FaWhatsapp size={16} color="#25D366" /></button>
                              </div>
                            </div>
                            <div className={styles.cardBody}>
                              <div className={styles.cardRow}><span>{t("mobile")}</span><strong>{u.mobile || "-"}</strong></div>
                              <div className={styles.cardRow}><span>{t("parents")}</span><strong>{u.parent_name || "-"} ({u.parent_mobile || "-"})</strong></div>
                              <div className={styles.cardRow}><span>{t("hostel")}</span><strong>{u.course || "-"} | {u.hostel_name || "-"} (Room {u.room_no || "-"})</strong></div>
                            </div>
                            <button onClick={() => toggleUserExpanded(u.user_id)} style={{ background: "transparent", border: "none", cursor: "pointer", width: "100%", padding: "8px", marginTop: "4px", display: "flex", justifyContent: "center", borderTop: "1px dashed #e5e7eb" }}>
                              <ChevronDown size={20} style={{ transform: expandedUsers.has(u.user_id) ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }} />
                            </button>
                          </div>

                          {expandedUsers.has(u.user_id) && (
                            <div className={styles.mobileHistory} style={{ borderTop: "1px solid #10b981", background: "#f9fafb", padding: "12px" }}>
                              <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#4b5563" }}>{t("billingHistory")}</h4>
                              {u.filteredMonths.length === 0 ? (
                                <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>No history.</p>
                              ) : u.filteredMonths.map(m => (
                                <div key={\`\${m.year}-\${m.month}\`} className={styles.mobileHistoryItem} style={{ background: "white", padding: 10, borderRadius: 6, marginBottom: 8, border: "1px solid #e5e7eb", opacity: m.paid ? 0.7 : 1 }}>
                                  <div className={styles.mobilerow}><span>{t("month")}</span><strong>{m.month}/{m.year}</strong></div>
                                  <div className={styles.mobilerow}><span>{t("total")}</span>₹{Number(m.total_amount).toFixed(2)}</div>
                                  <div className={styles.mobilerow}><span>{t("advance")}</span>₹{Number(m.advance_amount).toFixed(2)}</div>
                                  <div className={styles.mobilerow}><span>{t("finalPayable")}</span><strong style={{ color: m.paid ? "#10b981" : "#ef4444" }}>₹{Number(m.final_amount).toFixed(2)}</strong></div>
                                  <div style={{ marginTop: 10 }}>
                                    <button 
                                      className={\`\${styles.btnAction} \${m.paid ? styles.btnSecondary : styles.btnPrimary}\`}
                                      style={{ width: "100%", padding: "8px", fontSize: 14 }}
                                      onClick={() => openPaymentModal(u, m)}
                                    >
                                      {m.paid ? t("editPayment") || "Edit Payment" : t("markPaid")}
                                    </button>
                                  </div>
                                </div>
                              ))}
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
                    <h3>{paymentModal.monthObj.paid ? "Edit Payment" : t("markPayment")} — {paymentModal.user.name} ({paymentModal.monthObj.month}/{paymentModal.monthObj.year})</h3>
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
                        <option value="UPI">UPI</option>
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
                      <textarea rows={3} value={paymentData.note} onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })} />
                    </div>
                    <div className={styles.modalActions}>
                      <button className={styles.btnPrimary} onClick={submitPayment}>{t("submit")}</button>
                      <button className={styles.btnSecondary} onClick={() => setPaymentModal(null)}>{t("cancel")}</button>
                    </div>
                  </div>
                </div>
              )}

              {advanceModal && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalContent}>
                    <h3>{t("advancePayment")} — {advanceModal.name}</h3>
                    <div className={styles.formGroup}>
                      <label>{t("amount")}</label>
                      <input type="number" value={advanceData.amount} onChange={(e) => setAdvanceData({ ...advanceData, amount: e.target.value })} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>{t("paymentMethod")}</label>
                      <select value={advanceData.payment_method} onChange={(e) => setAdvanceData({ ...advanceData, payment_method: e.target.value })}>
                        <option value="">{t("select")}</option>
                        <option value="Cash">{t("cash")}</option>
                        <option value="UPI">UPI</option>
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

              {waDrawer && (
                <div className={styles.waOverlay} onClick={() => setWaDrawer(null)}>
                  <div className={styles.waModal} onClick={(e) => e.stopPropagation()}>
                    <h3>{t("sendWhatsApp")}</h3>
                    <div className={styles.waUser}><strong>{waDrawer.name}</strong></div>
                    <textarea className={styles.waTextarea} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} />
                    <div className={styles.waButtons}>
                      <button className={styles.waSend} onClick={() => sendWhatsApp(waDrawer.mobile)}>{t("sendToStudent")}</button>
                      <button className={styles.waCancel} onClick={() => setWaDrawer(null)}>{t("cancel")}</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "payments" && <PaymentHistory token={token} />}
        </main>
      </div>
    </Layout>
  );
}
`;

fs.writeFileSync('pages/billing/index.js', code);
