import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, CalendarDays } from "lucide-react";

export default function StaffReport() {
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
    let present = 0, absent = 0, late = 0, wo = 0;
    attendance.forEach(r => {
      if (r.attendance_type === 'P' || r.attendance_type === 'H') present++;
      if (r.attendance_type === 'A') absent++;
      if (r.attendance_type === 'WO') wo++;
      if (r.is_late) late++;
    });
    return { present, absent, late, wo };
  }, [attendance]);

  if (loading && !profile) return <Layout><div className={styles.container}>Loading...</div></Layout>;
  if (!profile) return <Layout><div className={styles.container}>Not Found</div></Layout>;

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
            <div><strong>Type:</strong> <span style={{ textTransform: "capitalize" }}>{profile.salary_type}</span></div>
            <div><strong>Base:</strong> ₹{profile.base_salary}</div>
            <div><strong>OT Rate:</strong> ₹{profile.overtime_rate}/hr</div>
          </div>
        </div>

        {/* Month Switcher */}
        <div className={styles.monthSwitcher}>
          <button className={styles.monthBtn} onClick={handlePrevMonth}><ChevronLeft size={20}/></button>
          <span>{monthName}</span>
          <button className={styles.monthBtn} onClick={handleNextMonth}><ChevronRight size={20}/></button>
        </div>

        {/* Attendance Summary */}
        <h3 className={styles.sectionTitle}>Attendance Summary</h3>
        <div className={styles.statsGrid} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className={styles.statCard}>
            <span><CheckCircle size={14}/> Present</span>
            <strong>{stats.present}</strong>
          </div>
          <div className={styles.statCard}>
            <span><XCircle size={14}/> Absent</span>
            <strong>{stats.absent}</strong>
          </div>
          <div className={styles.statCard} style={{ background: "#fef9c3" }}>
            <span style={{ color: "#854d0e" }}><Clock size={14}/> Late</span>
            <strong style={{ color: "#854d0e" }}>{stats.late}</strong>
          </div>
          <div className={styles.statCard}>
            <span><CalendarDays size={14}/> WO</span>
            <strong>{stats.wo}</strong>
          </div>
        </div>

        {/* Payment Summary */}
        <h3 className={styles.sectionTitle}>Payment Summary</h3>
        {salaryDetails ? (
          <div className={styles.tableBox} style={{ padding: "1rem", background: "white", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "#4b5563" }}>Basic Salary</span>
              <strong>₹{salaryDetails.base_salary}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "#4b5563" }}>+ Overtime Earnings</span>
              <strong style={{ color: "#16a34a" }}>₹{salaryDetails.overtime_amount}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px dashed #d1d5db" }}>
              <span style={{ color: "#4b5563" }}>- Late Penalty</span>
              <strong style={{ color: "#dc2626" }}>₹{salaryDetails.penalty_amount}</strong>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontWeight: 600 }}>Gross Earnings</span>
              <strong style={{ fontSize: "1.1rem" }}>
                ₹{Number(salaryDetails.base_salary) + Number(salaryDetails.overtime_amount) - Number(salaryDetails.penalty_amount)}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px dashed #d1d5db" }}>
              <span style={{ color: "#4b5563" }}>- Advance Paid</span>
              <strong style={{ color: "#dc2626" }}>₹{salaryDetails.total_paid}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>Net Payable</span>
              <strong style={{ fontSize: "1.5rem", color: "#007170" }}>₹{salaryDetails.final_salary}</strong>
            </div>
          </div>
        ) : (
          <div className={styles.emptyMsg} style={{ marginBottom: "1.5rem" }}>
            Payroll hasn't been generated for this month yet.
          </div>
        )}

        {/* Attendance Details Table */}
        <h3 className={styles.sectionTitle}>Attendance Details</h3>
        <div className={styles.tableBox}>
          {attendance.length === 0 && <p className={styles.emptyMsg}>No attendance marked.</p>}
          {attendance.map((row, i) => (
            <div key={i} className={styles.tlRow} style={{ alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>{new Date(row.attendance_date).toLocaleDateString()}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  {row.is_late && <span style={{ color: "#b91c1c", marginRight: "0.5rem" }}>Late: {row.late_minutes}m</span>}
                  {row.overtime_hours > 0 && <span style={{ color: "#059669" }}>OT: {row.overtime_hours}h</span>}
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
