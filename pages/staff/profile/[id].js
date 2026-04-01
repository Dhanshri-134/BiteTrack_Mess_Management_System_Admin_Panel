import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import DayDropdown from "../../../components/DayDropdown";
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
const PAYMENT_TYPES = ["advance", "partial", "final"];

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function normalizePaymentType(value) {
  return String(value || "").toLowerCase();
}

function statusLabel(type, row) {
  if (!row) return "OFF";
  if (type === "H") return "HF";
  if (type === "OFF") return "OFF";
  return type || "OFF";
}

function toLocalIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildCalendarRows(dateObj, attendance, payments) {
  const year = dateObj.getFullYear();
  const monthIndex = dateObj.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDay = new Date(year, monthIndex + 1, 0);
  const attendanceMap = new Map(
    attendance.map((row) => [String(row.attendance_date).split("T")[0], row])
  );
  const paymentMap = payments.reduce((map, payment) => {
    const key = String(payment?.payment_date || "").split("T")[0];
    if (!key) return map;

    const existingAmount = map.get(key) || 0;
    map.set(key, existingAmount + Number(payment?.amount || 0));
    return map;
  }, new Map());

  const days = Array.from({ length: firstDay }, (_, index) => ({
    key: `blank-${index}`,
    isBlank: true,
  }));

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, monthIndex, day);
    const iso = toLocalIsoDate(date);
    days.push({
      key: iso,
      iso,
      day,
      weekday: WEEKDAYS[date.getDay()],
      row: attendanceMap.get(iso),
      paymentAmount: paymentMap.get(iso) || 0,
    });
  }

  return { days };
}

export default function StaffProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();

  const ATTENDANCE_OPTIONS = [
    { label: "P", value: "P" },
    { label: t("hF"), value: "H" },
    { label: "A", value: "A" },
    { label: "L", value: "L" },
    { label: t("oFF"), value: "OFF" },
  ];

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
  const [savingStatus, setSavingStatus] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_type: "advance",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [modalData, setModalData] = useState({
    date: new Date().toISOString().split("T")[0],
    check_in: "09:00",
    check_out: "18:00",
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

  function handlePaymentInputChange(event) {
    const name = event?.target?.name;
    if (!name) return;

    setPaymentForm((prev) => ({
      ...prev,
      [name]: event.target.value,
    }));
  }

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
        toast.error(t("staffNotFound"));
        return;
      }

      setProfile(found);

      const attendanceKey = `staff-profile-attendance-${found.id}-${month}-${year}-v2`;
      const paymentsKey = `staff-profile-payments-${found.id}-${month}-${year}-v2`;
      const salaryKey = `staff-profile-salary-${found.id}-${month}-${year}-v5`;

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
      toast.error(t("failedToLoadProfile"));
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

    if (field === "attendance_type" && ["A", "L", "OFF"].includes(value)) {
      updated.is_late = false;
      updated.late_minutes = 0;
      updated.penalty_amount = 0;
      updated.overtime_hours = 0;
      updated.overtime_amount = 0;
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
      toast.success(t("attendanceSaved"));
      setShowModal(false);
      await fetchData(true);
    } catch (error) {
      toast.error(t("failedToSaveAttendance"));
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (!profile?.id || !paymentForm.amount) {
      toast.error(t("amountRequired"));
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
      toast.success(t("paymentRecorded"));
      setPaymentForm({ amount: "", payment_type: "advance", payment_date: new Date().toISOString().split("T")[0], notes: "" });
      await fetchData(true);
    } catch (error) {
      toast.error(t("failedToRecordPayment"));
    } finally {
      setSavingPayment(false);
    }
  }

  async function toggleStaffStatus() {
    if (!profile?.id) return;

    try {
      setSavingStatus(true);
      await staffRequest("/api/staff/toggleActive/", {
        body: {
          id: profile.id,
          is_active: profile.is_active === false,
        },
      });
      await fetchData(true);
      toast.success(profile.is_active === false ? "Staff activated" : "Staff deactivated");
    } catch (error) {
      toast.error("Failed to update staff status");
    } finally {
      setSavingStatus(false);
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

  const calendar = useMemo(
    () => buildCalendarRows(dateObj, attendance, payments),
    [attendance, dateObj, payments]
  );

  const paymentSummary = useMemo(() => {
    const paymentTotal = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
    const configuredBase = Number(
      salaryDetails?.configured_base_salary ?? profile?.base_salary ?? 0
    );
    const manualSalary = Number(salaryDetails?.base_salary || 0);
    const overtime = Number(salaryDetails?.overtime_amount || 0);
    const penalty = Number(salaryDetails?.penalty_amount || 0);
    const totalPaid = Number(salaryDetails?.total_paid ?? paymentTotal);
    const gross = Number(salaryDetails?.gross_salary ?? manualSalary + overtime - penalty);
    const finalSalary = Number(
      salaryDetails?.final_salary ?? Math.max(gross - totalPaid, 0)
    );

    return {
      configuredBase,
      manualSalary,
      overtime,
      penalty,
      totalPaid,
      finalSalary,
      gross,
      salaryAdded: Boolean(salaryDetails?.id),
    };
  }, [payments, profile, salaryDetails]);

  if (loading && !profile) {
    return <Layout title={t("staffProfile")}><div className={styles.profileContainer}>{t("loading")}</div></Layout>;
  }

  if (!profile) {
    return <Layout title={t("staffProfile")}><div className={styles.profileContainer}>{t("staffNotFound")}</div></Layout>;
  }

  return (
    <Layout title={`${t("profile")}: ${profile.name}`}>
      <div className={styles.profileContainer}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={16} /> {t("back")}
        </button>

        <div className={styles.profileHero}>
          <div className={styles.profileHeaderMain}>
            <div className={styles.avatar}>{profile.name?.charAt(0) || "S"}</div>

            <div className={styles.profileInfo}>
              <div className={styles.header}>

              <h1 className={styles.profileName}>{profile.name}</h1>
            <button className={styles.iconAction} type="button" onClick={() => router.push(`/staff/edit/${profile.id}`)}>
              <Edit3 size={18} />
            </button>
              </div>
              <p className={styles.profilePhone}>{profile.phone || t("noPhone")}</p>
              
              <div className={styles.profileMetaRow}>
                <span className={styles.profileMetaPill}>{profile.role || t("staff")}</span>
                <span className={styles.profileMetaPill}>{String(profile.salary_type || "monthly").toUpperCase()}</span>
                <span className={`${styles.profileMetaPill} ${profile.is_active === false ? styles.profileStatusInactive : styles.profileStatusActive}`}>
                  {profile.is_active === false ? "Inactive" : "Active"}
                </span>
              </div>
            </div>
          </div>

       
          <div className={styles.balanceStrip}>
            <div>
              <span className={styles.balanceLabelInline}>{t("currentBalance")}</span>
              <strong className={styles.balanceValueInline}>{formatMoney(profile.current_balance)}</strong>
            </div>
            <div className={styles.balanceMiniStats}>
              <span>{t("baseSalary")} {formatMoney(profile.base_salary)}</span>
              <span>{t("late")} {formatMoney(profile.late_penalty)}/min</span>
              <span>{t("overtime")} {formatMoney(profile.overtime_rate)}/hr</span>
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
            <RefreshCw size={16} className={refreshing ? styles.spin : ""} /> {t("refresh")}
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}><span><CheckCircle size={14} /> {t("present")}</span><strong>{stats.present}</strong></div>
          <div className={styles.statCard}><span><XCircle size={14} /> {t("absent")}</span><strong>{stats.absent}</strong></div>
          <div className={styles.statCard}><span><Clock size={14} /> {t("late")}</span><strong>{stats.late}</strong></div>
          <div className={styles.statCard}><span><CalendarDays size={14} /> {t("otHours")}</span><strong>{stats.overtimeHours.toFixed(2)}</strong></div>
          <div className={`${styles.statCard} ${styles.statCardWide}`}><span><IndianRupee size={14} /> {t("otAmount")}</span><strong>{formatMoney(stats.overtimeAmount)}</strong></div>
          <div className={`${styles.statCard} ${styles.statCardWide}`}><span><Banknote size={14} /> {t("advance")}</span><strong>{formatMoney(stats.advance)}</strong></div>
        </div>

        <div className={styles.actionRow}>
          <button className={`${styles.actionBtn} ${styles.markAttendance}`} type="button" onClick={() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            setModalData((prev) => ({
              ...prev,
              date: new Date().toISOString().split("T")[0],
              check_in: currentTime,
              check_out: String(profile.shift_end || "18:00").slice(0, 5),
            }));
            setShowModal(true);
          }}>
            <ClipboardCheck size={18} /> {t("markAttendance")}
          </button>
          <button className={styles.actionBtn} type="button" onClick={() => router.push(`/staff/report/${profile.id}`)}>
            <FileText size={18} /> {t("openReport")}
          </button>
          <button className={styles.actionBtn} type="button" onClick={toggleStaffStatus} disabled={savingStatus}>
            {savingStatus ? t("saving") : profile.is_active === false ? "Activate Staff" : "Deactivate Staff"}
          </button>
        </div>

        <div className={styles.tabSlider}>
          <button type="button" className={`${styles.tabBtn} ${activeTab === "attendance" ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab("attendance")}>{t("attendance")}</button>
          <button type="button" className={`${styles.tabBtn} ${activeTab === "payments" ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab("payments")}>{t("payment")}</button>
        </div>

        {activeTab === "attendance" ? (
          <section className={styles.sectionBlock}>
            <div className={styles.sectionHead}>
              <div>
                <h3 className={styles.sectionTitle}>{t("attendanceCalendar")}</h3>
                {/* <p className={styles.sectionSubtitle}>{t("attendanceCalendarLegend")}</p> */}
              </div>
            </div>

            <div className={styles.calendarShell}>
              <div className={styles.calendarWeekdays}>
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className={styles.calendarGrid}>
                {calendar.days.map(({ key, isBlank, iso, day, weekday, row, paymentAmount }) => {
                  if (isBlank) {
                    return <div key={key} className={styles.calendarBlank} aria-hidden="true" />;
                  }

                  const attendanceType = row?.attendance_type || "";
                  const label = statusLabel(attendanceType, row);

                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.calendarCard} ${row ? styles.calendarCardMarked : styles.calendarCardEmpty}`}
                      onClick={() => {
                        setModalData({
                          date: iso,
                          check_in: row?.check_in ? String(row.check_in).slice(11, 16) : "09:00",
                          check_out: row?.check_out ? String(row.check_out).slice(11, 16) : String(profile.shift_end || "18:00").slice(0, 5),
                          attendance_type: attendanceType || "P",
                          is_late: Boolean(row?.is_late),
                          late_minutes: Number(row?.late_minutes || 0),
                          penalty_amount: Number(row?.penalty_amount || 0),
                          overtime_hours: Number(row?.overtime_hours || 0),
                          overtime_amount: Number(row?.overtime_amount || 0),
                          notes: row?.notes || "",
                        });
                        setShowModal(true);
                      }}
                    >
                      <div className={styles.calendarCardHeader}>
                        <strong>{String(day).padStart(2, "0")}</strong>
                        <span>{weekday}</span>
                      </div>
                      <div className={styles.calendarBadgeRow}>
                        <span className={`${styles.statusPill} ${styles[`status${label}`] || styles.statusOFF}`}>{label}</span>
                        {row?.is_late ? <span className={`${styles.statusPill} ${styles.statusL}`}>L</span> : null}
                        {Number(row?.overtime_amount || 0) > 0 ? <span className={`${styles.statusPill} ${styles.statusOT}`}>{t("oT")}</span> : null}
                      </div>
                      <div className={styles.calendarInfo}>
                        {row ? (
                          <>
                            <span>{t("inLabel", { time: row.check_in ? String(row.check_in).slice(11, 16) : "--:--" })}</span>
                            <span>{t("outLabel", { time: row.check_out ? String(row.check_out).slice(11, 16) : "--:--" })}</span>
                            {Number(row.overtime_amount || 0) > 0 ? <span className={styles.calendarAmount}>{formatMoney(row.overtime_amount)}</span> : <span className={styles.calendarMuted}>{row.attendance_type === "A" ? t("absent") : t("noOT")}</span>}
                          </>
                        ) : (
                          <span className={styles.calendarMuted}>{t("noData")}</span>
                        )}
                        <span className={paymentAmount > 0 ? styles.calendarAmount : styles.calendarMuted}>
                          {paymentAmount > 0 ? `${formatMoney(paymentAmount)} paid` : "No payment"}
                        </span>
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
            <div className={styles.summaryBox}><span>Profile Base</span><strong>{formatMoney(paymentSummary.configuredBase)}</strong></div>
            <div className={styles.summaryBox}><span>Saved Salary</span><strong>{formatMoney(paymentSummary.manualSalary)}</strong></div>
            <div className={styles.summaryBox}><span>{t("overtime")}</span><strong>{formatMoney(paymentSummary.overtime)}</strong></div>
            <div className={styles.summaryBox}><span>{t("penalty")}</span><strong>{formatMoney(paymentSummary.penalty)}</strong></div>
            <div className={styles.summaryBox}><span>{t("grossSalary")}</span><strong>{formatMoney(paymentSummary.gross)}</strong></div>
            <div className={styles.summaryBox}><span>{t("advances")}</span><strong>{formatMoney(paymentSummary.totalPaid)}</strong></div>
            <div className={`${styles.summaryBox} ${styles.summaryBoxWide}`}><span>{t("netPayable")}</span><strong>{formatMoney(paymentSummary.finalSalary)}</strong></div>
          </div>
            <p className={styles.summaryHint}>
              {paymentSummary.salaryAdded
                ? `This month salary is saved manually for ${monthName}. Attendance does not auto-change salary.`
                : `Salary is not added yet for ${monthName}. Add it from Salary Management.`}
            </p>

            <form className={styles.paymentFormCard} onSubmit={submitPayment}>
              <div className={styles.sectionHead}><div><h3 className={styles.sectionTitle}>{t("addPayment")}</h3><p className={styles.sectionSubtitle}>{t("recordPaymentDescription")}</p></div><Wallet size={18} /></div>
              <div className={styles.formGridCompact}>
                <div className={styles.formGroup}><label htmlFor="staff-payment-amount">{t("amount")}</label><input id="staff-payment-amount" className={styles.formInput} type="number" min="0" step="0.01" name="amount" value={paymentForm.amount} onChange={handlePaymentInputChange} placeholder="0.00" autoComplete="off" /></div>
                <div className={styles.formGroup}><label htmlFor="staff-payment-type">{t("type")}</label><div id="staff-payment-type"><DayDropdown options={PAYMENT_TYPES.map((type) => ({ value: type, label: t(type) }))} value={paymentForm.payment_type} onChange={(value) => setPaymentForm((prev) => ({ ...prev, payment_type: value }))} /></div></div>
                <div className={styles.formGroup}><label htmlFor="staff-payment-date">{t("date")}</label><input id="staff-payment-date" className={styles.formInput} type="date" name="payment_date" value={paymentForm.payment_date} onChange={handlePaymentInputChange} autoComplete="on" /></div>
                <div className={`${styles.formGroup} ${styles.formGroupWide}`}><label htmlFor="staff-payment-notes">{t("notes")}</label><input id="staff-payment-notes" className={styles.formInput} type="text" name="notes" value={paymentForm.notes} onChange={handlePaymentInputChange} placeholder={t("optionalNote")} autoComplete="on" /></div>
              </div>
              <button className={styles.btnPrimary} type="submit" disabled={savingPayment}>{savingPayment ? t("saving") : t("recordPayment")}</button>
            </form>

            <div className={styles.timelineList}>
              {payments.length === 0 ? <div className={styles.emptyMsg}>{t("noPaymentsRecordedThisMonth")}</div> : payments.map((payment) => (
                <div key={payment.id} className={styles.timelineItem}>
                  <div className={styles.tlIcon}><Banknote size={18} /></div>
                  <div className={styles.tlDetails}>
                    <div className={styles.tlRow}><strong>{String(payment.payment_type || "").toUpperCase()}</strong><span className={styles.tlAmount}>{formatMoney(payment.amount)}</span></div>
                    <div className={styles.tlRow2}><span>{new Date(payment.payment_date).toLocaleDateString()}</span><span>{payment.notes || t("noNote")}</span></div>
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
                <h2>{t("markAttendance")}</h2>
                <button type="button" className={styles.iconAction} onClick={() => setShowModal(false)}><XCircle size={20} /></button>
              </div>

              <div className={styles.formGridCompact}>
                <div className={styles.formGroup}><label htmlFor="attendance-date">{t("date")}</label><input id="attendance-date" type="date" className={styles.formInput} name="date" value={modalData.date} onChange={(event) => updateModalField("date", event.target.value)} autoComplete="on" /></div>
                <div className={styles.formGroup}><label htmlFor="attendance-checkin">{t("checkIn")}</label><input id="attendance-checkin" type="time" className={styles.formInput} name="check_in" value={modalData.check_in} onChange={(event) => updateModalField("check_in", event.target.value)} autoComplete="on" /></div>
                <div className={styles.formGroup}><label htmlFor="attendance-checkout">{t("checkOut")}</label><input id="attendance-checkout" type="time" className={styles.formInput} name="check_out" value={modalData.check_out} onChange={(event) => updateModalField("check_out", event.target.value)} autoComplete="on" /></div>
                <div className={`${styles.formGroup} ${styles.formGroupWide}`}>
                  <label>{t("status")}</label>
                  <div className={styles.btnTypes}>
                    {ATTENDANCE_OPTIONS.map((option) => (
                      <button key={option.value} type="button" className={`${styles.typeBtn} ${modalData.attendance_type === option.value ? styles.active : ""}`} onClick={() => updateModalField("attendance_type", option.value)}>{option.label}</button>
                    ))}
                  </div>
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupWide}`}><label htmlFor="attendance-notes">{t("notes")}</label><input id="attendance-notes" type="text" className={styles.formInput} name="notes" value={modalData.notes} onChange={(event) => updateModalField("notes", event.target.value)} placeholder={t("optionalNote")} autoComplete="on" /></div>
              </div>

              {modalData.is_late ? <div className={styles.previewAlert}><Clock size={16} /> {t("latePenaltyPreview", { minutes: modalData.late_minutes, amount: formatMoney(modalData.penalty_amount) })}</div> : null}
              {Number(modalData.overtime_amount || 0) > 0 ? <div className={styles.previewOT}><CheckCircle size={16} /> {t("overtimePreview", { hours: Number(modalData.overtime_hours || 0).toFixed(2), amount: formatMoney(modalData.overtime_amount) })}</div> : null}
              <button className={styles.btnPrimary} type="button" onClick={submitAttendance}>{t("saveAttendance")}</button>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
