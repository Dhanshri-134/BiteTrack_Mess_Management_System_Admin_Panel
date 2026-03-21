import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffOfflineRequest, staffRequest } from "@/lib/staffClient";
import { useLanguage } from "../../../context/LanguageContext";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Edit3,
  FileText,
  IndianRupee,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function normalizePaymentType(value) {
  return String(value || "").toLowerCase();
}

function statusLabel(type, row) {
  if (!row) return "OFF";
  if (type === "H") return "HF";
  return type || "OFF";
}

function buildCalendarRows(dateObj, attendance) {
  const year = dateObj.getFullYear();
  const monthIndex = dateObj.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const attendanceMap = new Map(
    attendance.map((row) => [String(row.attendance_date).split("T")[0], row])
  );

  const days = [];
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, monthIndex, day);
    const iso = date.toISOString().split("T")[0];
    days.push({
      iso,
      day,
      weekday: WEEKDAYS[date.getDay()],
      row: attendanceMap.get(iso),
    });
  }

  return { leadingBlankCount: firstDay.getDay(), days };
}

export default function StaffProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();

  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salaryDetails, setSalaryDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("attendance");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_type: "advance",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [modalData, setModalData] = useState({
    date: new Date().toISOString().split("T")[0],
    check_in: "09:00",
    check_out: "",
    attendance_type: "P",
    is_late: false,
    late_minutes: 0,
    penalty_amount: 0,
    overtime_hours: 0,
    overtime_amount: 0,
    notes: "",
  });

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const monthName = dateObj.toLocaleString("default", { month: "long", year: "numeric" });

  useEffect(() => {
    if (id) fetchData(false);
  }, [id, month, year]);

  async function fetchData(forceRefresh) {
    if (!id) return;

    try {
      setLoading((prev) => (profile ? prev : true));
      setRefreshing(forceRefresh);

      const staffList = forceRefresh
        ? await staffRequest("/api/staff/list/", { method: "GET" })
        : await staffOfflineRequest("staff-list-v3", "/api/staff/list/", { method: "GET" });

      const found = (staffList || []).find((staff) => String(staff.id) === String(id));
      if (!found) {
        setProfile(null);
        toast.error("Staff not found");
        return;
      }

      setProfile(found);

      const attendanceKey = `staff-profile-attendance-${found.id}-${month}-${year}-v2`;
      const paymentsKey = `staff-profile-payments-${found.id}-${month}-${year}-v2`;
      const salaryKey = `staff-profile-salary-${found.id}-${month}-${year}-v2`;

      const [attendanceRes, paymentsRes, salaryRes] = forceRefresh
        ? await Promise.all([
            staffRequest("/api/staff/attendance/history/", { body: { staff_id: found.id, month, year } }),
            staffRequest("/api/staff/payments/list/", { body: { staff_id: found.id, month, year } }),
            staffRequest("/api/staff/salary/list/", { body: { month, year } }),
          ])
        : await Promise.all([
            staffOfflineRequest(attendanceKey, "/api/staff/attendance/history/", { method: "POST", body: { staff_id: found.id, month, year } }),
            staffOfflineRequest(paymentsKey, "/api/staff/payments/list/", { method: "POST", body: { staff_id: found.id, month, year } }),
            staffOfflineRequest(salaryKey, "/api/staff/salary/list/", { method: "POST", body: { month, year } }),
          ]);

      setAttendance(attendanceRes?.data || []);
      setPayments(paymentsRes?.data || []);
      setSalaryDetails((salaryRes?.data || []).find((salary) => String(salary.staff_id) === String(found.id)) || null);
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function updateModalField(field, value) {
    if (!profile) return;
    const updated = { ...modalData, [field]: value };

    if (field === "check_in") {
      const lateTime = String(profile.late_after || "09:30").slice(0, 5);
      if (value && value > lateTime) {
        const [h1, m1] = value.split(":").map(Number);
        const [h2, m2] = lateTime.split(":").map(Number);
        updated.is_late = true;
        updated.late_minutes = Math.max(0, h1 * 60 + m1 - (h2 * 60 + m2));
        updated.penalty_amount = updated.late_minutes * Number(profile.late_penalty || 0);
        if (updated.late_minutes > 120 && updated.attendance_type === "P") updated.attendance_type = "H";
      } else {
        updated.is_late = false;
        updated.late_minutes = 0;
        updated.penalty_amount = 0;
      }
    }

    if (field === "check_out") {
      const shiftEnd = String(profile.shift_end || "18:00").slice(0, 5);
      if (value && value > shiftEnd) {
        const [h1, m1] = value.split(":").map(Number);
        const [h2, m2] = shiftEnd.split(":").map(Number);
        const diffMinutes = Math.max(0, h1 * 60 + m1 - (h2 * 60 + m2));
        updated.overtime_hours = Number((diffMinutes / 60).toFixed(2));
        updated.overtime_amount = updated.overtime_hours * Number(profile.overtime_rate || 0);
      } else {
        updated.overtime_hours = 0;
        updated.overtime_amount = 0;
      }
    }

    setModalData(updated);
  }

  async function submitAttendance() {
    try {
      await staffRequest("/api/staff/attendance/mark/", {
        body: {
          staff_id: profile.id,
          attendance_date: modalData.date,
          check_in: modalData.check_in,
          check_out: modalData.check_out,
          attendance_type: modalData.attendance_type,
          notes: modalData.notes,
        },
      });
      toast.success("Attendance saved");
      setShowModal(false);
      await fetchData(true);
    } catch (error) {
      toast.error("Failed to save attendance");
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (!profile?.id || !paymentForm.amount) {
      toast.error("Amount is required");
      return;
    }

    try {
      setSavingPayment(true);
      await staffRequest("/api/staff/payments/create/", {
        body: {
          staff_id: profile.id,
          amount: Number(paymentForm.amount),
          payment_type: paymentForm.payment_type,
          payment_date: paymentForm.payment_date,
          notes: paymentForm.notes,
        },
      });
      toast.success("Payment recorded");
      setPaymentForm({ amount: "", payment_type: "advance", payment_date: new Date().toISOString().split("T")[0], notes: "" });
      await fetchData(true);
    } catch (error) {
      toast.error("Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  }

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let overtimeHours = 0;
    let overtimeAmount = 0;

    attendance.forEach((row) => {
      if (row.attendance_type === "P" || row.attendance_type === "H") present += 1;
      if (row.attendance_type === "A") absent += 1;
      if (row.is_late) late += 1;
      overtimeHours += Number(row.overtime_hours || 0);
      overtimeAmount += Number(row.overtime_amount || 0);
    });

    const advance = payments.reduce((sum, payment) => normalizePaymentType(payment.payment_type).includes("advance") ? sum + Number(payment.amount || 0) : sum, 0);
    return { present, absent, late, overtimeHours, overtimeAmount, advance };
  }, [attendance, payments]);

  const calendar = useMemo(() => buildCalendarRows(dateObj, attendance), [attendance, dateObj]);

  const paymentSummary = useMemo(() => {
    const base = Number(salaryDetails?.base_salary || 0);
    const overtime = Number(salaryDetails?.overtime_amount || 0);
    const penalty = Number(salaryDetails?.penalty_amount || 0);
    const totalPaid = Number(salaryDetails?.total_paid || 0);
    const finalSalary = Number(salaryDetails?.final_salary || 0);
    return { base, overtime, penalty, totalPaid, finalSalary, gross: base + overtime - penalty };
  }, [salaryDetails]);

  if (loading && !profile) {
    return <Layout title="Staff Profile"><div className={styles.profileContainer}>Loading...</div></Layout>;
  }

  if (!profile) {
    return <Layout title="Staff Profile"><div className={styles.profileContainer}>Staff not found</div></Layout>;
  }

  return (
    <Layout title={`Profile: ${profile.name}`}>
      <div className={styles.profileContainer}>

        <div className={styles.profileHero}>
          <div className={styles.profileHeaderMain}>
            <div className={styles.avatar}>{profile.name?.charAt(0) || "S"}</div>

            <div className={styles.profileInfo}>
              <h1 className={styles.profileName}>{profile.name}</h1>
              <p className={styles.profilePhone}>{profile.phone || "No phone"}</p>
              
              <div className={styles.profileMetaRow}>
                <span className={styles.profileMetaPill}>{profile.role || "Staff"}</span>
                <span className={styles.profileMetaPill}>{String(profile.salary_type || "monthly").toUpperCase()}</span>
              </div>
            </div>
            <button className={styles.iconAction} type="button" onClick={() => router.push(`/staff/edit/${profile.id}`)}>
              <Edit3 size={18} />
            </button>
             <button type="button" className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={16} /> Back
        </button>
          </div>

       
          <div className={styles.balanceStrip}>
            <div>
              <span className={styles.balanceLabelInline}>Current Balance</span>
              <strong className={styles.balanceValueInline}>{formatMoney(profile.current_balance)}</strong>
            </div>
            <div className={styles.balanceMiniStats}>
              <span>Base {formatMoney(profile.base_salary)}</span>
              <span>Late {formatMoney(profile.late_penalty)}/min</span>
              <span>OT {formatMoney(profile.overtime_rate)}/hr</span>
            </div>
          </div>
        </div>

        <div className={styles.monthToolbar}>
          <div className={styles.monthSwitcher}>
            <button className={styles.monthBtn} type="button" onClick={() => setDateObj((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}><ChevronLeft size={20} /></button>
            <span>{monthName}</span>
            <button className={styles.monthBtn} type="button" onClick={() => setDateObj((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}><ChevronRight size={20} /></button>
          </div>
          <button className={styles.refreshBtn} type="button" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? styles.spin : ""} /> Refresh
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span><CheckCircle size={14} /> Present</span><strong>{stats.present}</strong></div>
          <div className={styles.statCard}><span><XCircle size={14} /> Absent</span><strong>{stats.absent}</strong></div>
          <div className={styles.statCard}><span><Clock size={14} /> Late</span><strong>{stats.late}</strong></div>
          <div className={styles.statCard}><span><CalendarDays size={14} /> OT Hours</span><strong>{stats.overtimeHours.toFixed(2)}</strong></div>
          <div className={`${styles.statCard} ${styles.statCardWide}`}><span><IndianRupee size={14} /> OT Amount</span><strong>{formatMoney(stats.overtimeAmount)}</strong></div>
          <div className={`${styles.statCard} ${styles.statCardWide}`}><span><Banknote size={14} /> Advance</span><strong>{formatMoney(stats.advance)}</strong></div>
        </div>

        <div className={styles.actionRow}>
          <button className={`${styles.actionBtn} ${styles.markAttendance}`} type="button" onClick={() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            setModalData((prev) => ({ ...prev, date: new Date().toISOString().split("T")[0], check_in: currentTime }));
            setShowModal(true);
          }}>
            <ClipboardCheck size={18} /> Mark Attendance
          </button>
          <button className={styles.actionBtn} type="button" onClick={() => router.push(`/staff/report/${profile.id}`)}>
            <FileText size={18} /> Open Report
          </button>
        </div>

        <div className={styles.tabSlider}>
          <button type="button" className={`${styles.tabBtn} ${activeTab === "attendance" ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab("attendance")}>Attendance</button>
          <button type="button" className={`${styles.tabBtn} ${activeTab === "payments" ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab("payments")}>Payment</button>
        </div>

        {activeTab === "attendance" ? (
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHead}>
              <div>
                <h3 className={styles.sectionTitle}>Attendance Calendar</h3>
                <p className={styles.sectionSubtitle}>P = Present, HF = Half Day, A = Absent, WO = Week Off, L = Late, OT = Overtime, OFF = no data.</p>
              </div>
            </div>

            <div className={styles.calendarShell}>
              <div className={styles.calendarWeekdays}>{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
              <div className={styles.calendarGrid}>
                {Array.from({ length: calendar.leadingBlankCount }).map((_, index) => <div key={`blank-${index}`} className={styles.calendarBlank} />)}
                {calendar.days.map(({ iso, day, weekday, row }) => {
                  const dayDate = new Date(iso);
                  const longDate = `${String(day).padStart(2, "0")} ${dayDate.toLocaleString("default", { month: "short" }).toUpperCase()}`;
                  const attendanceType = row?.attendance_type || "";
                  const label = statusLabel(attendanceType, row);
                  return (
                    <button key={iso} type="button" className={`${styles.calendarCard} ${row ? styles.calendarCardMarked : styles.calendarCardEmpty}`} onClick={() => {
                      setModalData({
                        date: iso,
                        check_in: row?.check_in ? String(row.check_in).slice(11, 16) : "09:00",
                        check_out: row?.check_out ? String(row.check_out).slice(11, 16) : "",
                        attendance_type: attendanceType || "P",
                        is_late: Boolean(row?.is_late),
                        late_minutes: Number(row?.late_minutes || 0),
                        penalty_amount: Number(row?.penalty_amount || 0),
                        overtime_hours: Number(row?.overtime_hours || 0),
                        overtime_amount: Number(row?.overtime_amount || 0),
                        notes: row?.notes || "",
                      });
                      setShowModal(true);
                    }}>
                      <div className={styles.calendarCardHeader}><strong>{longDate}</strong><span>{weekday}</span></div>
                      <div className={styles.calendarBadgeRow}>
                        <span className={`${styles.statusPill} ${styles[`status${label}`] || styles.statusOFF}`}>{label}</span>
                        {row?.is_late ? <span className={`${styles.statusPill} ${styles.statusL}`}>L</span> : null}
                        {Number(row?.overtime_amount || 0) > 0 ? <span className={`${styles.statusPill} ${styles.statusOT}`}>OT</span> : null}
                      </div>
                      <div className={styles.calendarInfo}>
                        {row ? (
                          <>
                            <span>In {row.check_in ? String(row.check_in).slice(11, 16) : "--:--"}</span>
                            <span>Out {row.check_out ? String(row.check_out).slice(11, 16) : "--:--"}</span>
                            {Number(row.overtime_amount || 0) > 0 ? <span className={styles.calendarAmount}>{formatMoney(row.overtime_amount)}</span> : <span className={styles.calendarMuted}>{row.attendance_type === "A" ? "Absent" : "No OT"}</span>}
                          </>
                        ) : (
                          <span className={styles.calendarMuted}>No data</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.sectionBlock}>
            <div className={styles.paymentSummaryGrid}>
              <div className={styles.summaryBox}><span>Base</span><strong>{formatMoney(paymentSummary.base)}</strong></div>
              <div className={styles.summaryBox}><span>OT</span><strong>{formatMoney(paymentSummary.overtime)}</strong></div>
              <div className={styles.summaryBox}><span>Penalty</span><strong>{formatMoney(paymentSummary.penalty)}</strong></div>
              <div className={styles.summaryBox}><span>Advances</span><strong>{formatMoney(paymentSummary.totalPaid)}</strong></div>
              <div className={`${styles.summaryBox} ${styles.summaryBoxWide}`}><span>Net Payable</span><strong>{formatMoney(paymentSummary.finalSalary)}</strong></div>
            </div>

            <form className={styles.paymentFormCard} onSubmit={submitPayment}>
              <div className={styles.sectionHead}><div><h3 className={styles.sectionTitle}>Add Payment</h3><p className={styles.sectionSubtitle}>Record advance, partial, or final payments from profile.</p></div><Wallet size={18} /></div>
              <div className={styles.formGridCompact}>
                <div className={styles.formGroup}><label>Amount</label><input className={styles.formInput} type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="0.00" /></div>
                <div className={styles.formGroup}><label>Type</label><select className={styles.formInput} value={paymentForm.payment_type} onChange={(event) => setPaymentForm((prev) => ({ ...prev, payment_type: event.target.value }))}><option value="advance">Advance</option><option value="partial">Partial</option><option value="final">Final</option></select></div>
                <div className={styles.formGroup}><label>Date</label><input className={styles.formInput} type="date" value={paymentForm.payment_date} onChange={(event) => setPaymentForm((prev) => ({ ...prev, payment_date: event.target.value }))} /></div>
                <div className={`${styles.formGroup} ${styles.formGroupWide}`}><label>Notes</label><input className={styles.formInput} type="text" value={paymentForm.notes} onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Optional note" /></div>
              </div>
              <button className={styles.btnPrimary} type="submit" disabled={savingPayment}>{savingPayment ? "Saving..." : "Record Payment"}</button>
            </form>

            <div className={styles.timelineList}>
              {payments.length === 0 ? <div className={styles.emptyMsg}>No payments recorded for this month.</div> : payments.map((payment) => (
                <div key={payment.id} className={styles.timelineItem}>
                  <div className={styles.tlIcon}><Banknote size={18} /></div>
                  <div className={styles.tlDetails}>
                    <div className={styles.tlRow}><strong>{String(payment.payment_type || "").toUpperCase()}</strong><span className={styles.tlAmount}>{formatMoney(payment.amount)}</span></div>
                    <div className={styles.tlRow2}><span>{new Date(payment.payment_date).toLocaleDateString()}</span><span>{payment.notes || "No note"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {showModal ? (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Mark Attendance</h2>
                <button type="button" className={styles.iconAction} onClick={() => setShowModal(false)}><XCircle size={20} /></button>
              </div>

              <div className={styles.formGridCompact}>
                <div className={styles.formGroup}><label>Date</label><input type="date" className={styles.formInput} value={modalData.date} onChange={(event) => updateModalField("date", event.target.value)} /></div>
                <div className={styles.formGroup}><label>Check In</label><input type="time" className={styles.formInput} value={modalData.check_in} onChange={(event) => updateModalField("check_in", event.target.value)} /></div>
                <div className={styles.formGroup}><label>Check Out</label><input type="time" className={styles.formInput} value={modalData.check_out} onChange={(event) => updateModalField("check_out", event.target.value)} /></div>
                <div className={`${styles.formGroup} ${styles.formGroupWide}`}>
                  <label>Status</label>
                  <div className={styles.btnTypes}>
                    {[{ label: "P", value: "P" }, { label: "HF", value: "H" }, { label: "A", value: "A" }, { label: "WO", value: "WO" }].map((option) => (
                      <button key={option.value} type="button" className={`${styles.typeBtn} ${modalData.attendance_type === option.value ? styles.active : ""}`} onClick={() => updateModalField("attendance_type", option.value)}>{option.label}</button>
                    ))}
                  </div>
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupWide}`}><label>Notes</label><input type="text" className={styles.formInput} value={modalData.notes} onChange={(event) => updateModalField("notes", event.target.value)} placeholder="Optional note" /></div>
              </div>

              {modalData.is_late ? <div className={styles.previewAlert}><Clock size={16} /> Late by {modalData.late_minutes} mins. Penalty {formatMoney(modalData.penalty_amount)}</div> : null}
              {Number(modalData.overtime_amount || 0) > 0 ? <div className={styles.previewOT}><CheckCircle size={16} /> Overtime {Number(modalData.overtime_hours || 0).toFixed(2)} hrs. Amount {formatMoney(modalData.overtime_amount)}</div> : null}
              <button className={styles.btnPrimary} type="button" onClick={submitAttendance}>Save Attendance</button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
