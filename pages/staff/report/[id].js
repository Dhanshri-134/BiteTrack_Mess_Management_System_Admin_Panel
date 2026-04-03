import { useLanguage } from "../../../context/LanguageContext";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, CalendarDays } from "lucide-react";

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

export default function StaffReport() {
  const { t } = useLanguage();

  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [dateObj, setDateObj] = useState(new Date());

  const [attendance, setAttendance] = useState([]);
  const [salaryDetails, setSalaryDetails] = useState(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, dateObj]);

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  const monthName = dateObj.toLocaleString("default", { month: "short", year: "numeric" });

  async function fetchData() {
    try {
      setLoading(true);
      
      const res = await staffRequest("/api/staff/list/", { method: "GET" });
      const found = res.find(s => String(s.id) === String(id));
      if (!found) {
        toast.error("Staff not found");
        return;
      }
      setProfile(found);

      const aRes = await staffRequest("/api/staff/attendance/history/", {
        method: "POST", body: { staff_id: found.id, month, year }
      });
      if (aRes.success) setAttendance(aRes.data);

      const sRes = await staffRequest("/api/staff/salary/list/", {
        method: "POST", body: { month, year }
      });
      if (sRes.success) {
        const matchingSalary = sRes.data.find(s => String(s.staff_id) === String(id));
        setSalaryDetails(matchingSalary || null);
      }

    } catch (err) {
      toast.error("Error loading report");
    } finally {
      setLoading(false);
    }
  }

  function handlePrevMonth() { setDateObj(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)); }
  function handleNextMonth() { setDateObj(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)); }

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, off = 0;
    attendance.forEach(r => {
      if (r.attendance_type === 'P' || r.attendance_type === 'H' || r.attendance_type === 'OT') present++;
      if (r.attendance_type === 'A') absent++;
      if (r.attendance_type === 'OFF') off++;
      if (r.is_late) late++;
    });
    return { present, absent, late, off };
  }, [attendance]);

  const paymentSummary = useMemo(() => {
    const baseSalary = Number(salaryDetails?.base_salary || 0);
    const overtime = Number(salaryDetails?.overtime_amount || 0);
    const penalty = Number(salaryDetails?.penalty_amount || 0);
    const gross = Number(salaryDetails?.gross_salary ?? baseSalary + overtime - penalty);
    const totalPaid = Number(salaryDetails?.total_paid || 0);
    const finalSalary = Number(salaryDetails?.final_salary || 0);

    return {
      profileBase: Number(salaryDetails?.configured_base_salary ?? profile?.base_salary ?? 0),
      baseSalary,
      overtime,
      penalty,
      gross,
      totalPaid,
      finalSalary,
      paymentStatus: String(salaryDetails?.payment_status || "not_added").toLowerCase(),
    };
  }, [profile?.base_salary, salaryDetails]);

  if (loading && !profile) return <Layout><div className={styles.container}>{t("loading")}</div></Layout>;
  if (!profile) return <Layout><div className={styles.container}>{t("notFound")}</div></Layout>;

  return (
    <Layout title={`Report: ${profile.name}`}>
      <div className={styles.profileContainer}>
        
        {/* Header / Staff Info Card */}
        <div className={styles.profileHeader} style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}>
          <div style={{ display: "flex",gap:"1rem", width: "100%" }}>
            <h1 className={styles.profileName}>{profile.name}</h1>
            <span className={styles.profileRole}>{profile.role}</span>
          <p className={styles.profilePhone} style={{ margin: 0 }}>{profile.phone || 'No phone'}</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem", fontSize: "0.9rem", color: "#374151" }}>
            <div><strong>{t("type")}</strong> <span style={{ textTransform: "capitalize" }}>{profile.salary_type}</span></div>
            <div><strong>{t("base")}</strong> ₹{profile.base_salary}</div>
            <div><strong>{t("oTRate")}</strong> ₹{profile.overtime_rate}/hr</div>
          </div>
        </div>

        {/* Month Switcher */}
        <div className={styles.monthSwitcher}>
          <button className={styles.monthBtn} onClick={handlePrevMonth}><ChevronLeft size={20}/></button>
          <span>{monthName}</span>
          <button className={styles.monthBtn} onClick={handleNextMonth}><ChevronRight size={20}/></button>
        </div>

        {/* Attendance Summary */}
        <h3 className={styles.sectionTitle}>{t("attendanceSummary")}</h3>
        <div className={styles.statsGrid} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className={styles.statCard}>
            <span><CheckCircle size={14}/> {t("present")}</span>
            <strong>{stats.present}</strong>
          </div>
          <div className={styles.statCard}>
            <span><XCircle size={14}/> {t("absent")}</span>
            <strong>{stats.absent}</strong>
          </div>
          <div className={styles.statCard} style={{ background: "#fef9c3" }}>
            <span style={{ color: "#854d0e" }}><Clock size={14}/> {t("late")}</span>
            <strong style={{ color: "#854d0e" }}>{stats.late}</strong>
          </div>
          <div className={styles.statCard}>
            <span><CalendarDays size={14}/> {t("oFF")}</span>
            <strong>{stats.off}</strong>
          </div>
        </div>

        {/* Payment Summary */}
        <h3 className={styles.sectionTitle}>{t("paymentSummary")}</h3>
        {salaryDetails ? (
          <section className={styles.sectionBlock}>
            <div className={styles.tlRow} style={{ marginBottom: "0.85rem" }}>
              <strong>{t("Salary Status")}</strong>
              <span className={`${styles.statusPill} ${
                paymentSummary.paymentStatus === "paid"
                  ? styles.statusP
                  : paymentSummary.paymentStatus === "partial"
                    ? styles.statusOT
                    : styles.statusL
              }`}>
                {paymentSummary.paymentStatus}
              </span>
            </div>
            <div className={styles.paymentSummaryGrid}>
              <div className={styles.summaryBox}><span>{t("Profile Base")}</span><strong>{formatMoney(paymentSummary.profileBase)}</strong></div>
              <div className={styles.summaryBox}><span>{t("Saved Salary")}</span><strong>{formatMoney(paymentSummary.baseSalary)}</strong></div>
              <div className={styles.summaryBox}><span>{t("overtime")}</span><strong>{formatMoney(paymentSummary.overtime)}</strong></div>
              <div className={styles.summaryBox}><span>{t("penalty")}</span><strong>{formatMoney(paymentSummary.penalty)}</strong></div>
              <div className={styles.summaryBox}><span>{t("grossSalary")}</span><strong>{formatMoney(paymentSummary.gross)}</strong></div>
              <div className={styles.summaryBox}><span>{t("advances")}</span><strong>{formatMoney(paymentSummary.totalPaid)}</strong></div>
              <div className={`${styles.summaryBox} ${styles.summaryBoxWide}`}><span>{t("netPayable")}</span><strong>{formatMoney(paymentSummary.finalSalary)}</strong></div>
            </div>
            <p className={styles.summaryHint} style={{ marginTop: "0.85rem" }}>
              {t("Manual salary values are shown here directly from the salary record for {{month}}. Attendance remains separate.", { month: monthName })}
            </p>
          </section>
        ) : (
          <div className={styles.emptyMsg} style={{ marginBottom: "1.5rem" }}>
            {t("Salary is not added for this month yet.")}
          </div>
        )}

        {/* Attendance Details Table */}
        <h3 className={styles.sectionTitle}>{t("attendanceDetails")}</h3>
        <div className={styles.tableBox}>
          {attendance.length === 0 && <p className={styles.emptyMsg}>{t("noAttendanceMarked")}</p>}
          {attendance.map((row, i) => (
            <div key={i} className={styles.tlRow} style={{ alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>{new Date(row.attendance_date).toLocaleDateString()}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  {row.is_late && <span style={{ color: "#b91c1c", marginRight: "0.5rem" }}>{t("Late: {{minutes}}m", { minutes: row.late_minutes })}</span>}
                  {row.overtime_hours > 0 && <span style={{ color: "#059669" }}>{t("OT: {{hours}}h", { hours: row.overtime_hours })}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`${styles['badge-' + row.attendance_type]} ${styles.attendanceTypeBadge}`}>{row.attendance_type}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </Layout>
  );
}
