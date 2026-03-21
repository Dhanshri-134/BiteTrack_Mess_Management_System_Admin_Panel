import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffOfflineRequest, staffRequest } from "@/lib/staffClient";
import { ArrowLeft, RefreshCw } from "lucide-react";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function AttendanceHistory() {
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    staff_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchAttendance(false);
  }, [filters.staff_id, filters.month, filters.year]);

  async function fetchStaff() {
    try {
      const data = await staffOfflineRequest("staff-list-v4", "/api/staff/list/", {
        method: "GET",
      });
      setStaffList(data || []);
    } catch (error) {
      toast.error("Failed to load staff");
    }
  }

  async function fetchAttendance(forceRefresh) {
    try {
      setLoading(true);
      const cacheKey = `staff-attendance-history-${filters.staff_id || "all"}-${filters.month}-${filters.year}-v2`;
      const response = forceRefresh
        ? await staffRequest("/api/staff/attendance/history/", { body: filters })
        : await staffOfflineRequest(cacheKey, "/api/staff/attendance/history/", {
            method: "POST",
            body: filters,
          });
      setAttendance(response?.data || []);
    } catch (error) {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Attendance History">
      <div className={styles.container}>
        <div className={styles.pageStack}>
          <button type="button" className={styles.backBtn} onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> Back
          </button>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>Attendance</p>
            <h1 className={styles.heroHeading}>Attendance History</h1>
            <p className={styles.heroText}>Review late penalties, overtime, and daily staff attendance from one filtered view.</p>
          </section>

          <section className={styles.paymentFormCard}>
            <div className={styles.formGridCompact}>
              <div className={styles.formGroup}>
                <label>Staff</label>
                <select className={styles.formInput} value={filters.staff_id} onChange={(event) => setFilters((prev) => ({ ...prev, staff_id: event.target.value }))}>
                  <option value="">All Staff</option>
                  {staffList.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Month</label>
                <select className={styles.formInput} value={filters.month} onChange={(event) => setFilters((prev) => ({ ...prev, month: Number(event.target.value) }))}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Year</label>
                <select className={styles.formInput} value={filters.year} onChange={(event) => setFilters((prev) => ({ ...prev, year: Number(event.target.value) }))}>
                  {[2025, 2026, 2027].map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Refresh</label>
                <button type="button" className={styles.refreshBtn} onClick={() => fetchAttendance(true)}>
                  <RefreshCw size={16} /> Refresh Data
                </button>
              </div>
            </div>
          </section>

          <section className={styles.timelineList}>
            {loading ? <div className={styles.emptyMsg}>Loading...</div> : null}
            {!loading && attendance.length === 0 ? <div className={styles.emptyMsg}>No attendance records found.</div> : null}
            {!loading && attendance.map((row) => (
              <div key={row.id} className={styles.timelineItem}>
                <div className={styles.tlDetails}>
                  <div className={styles.tlRow}>
                    <strong>{row.name}</strong>
                    <span className={`${styles.statusPill} ${styles[`status${row.attendance_type === "H" ? "HF" : row.attendance_type}`] || styles.statusOFF}`}>
                      {row.attendance_type === "H" ? "HF" : row.attendance_type}
                    </span>
                  </div>
                  <div className={styles.tlRow2}>
                    <span>{new Date(row.attendance_date).toLocaleDateString()}</span>
                    <span>In {row.check_in ? String(row.check_in).slice(11, 16) : "--:--"} / Out {row.check_out ? String(row.check_out).slice(11, 16) : "--:--"}</span>
                  </div>
                  <div className={styles.statusLegend} style={{ marginTop: "0.5rem" }}>
                    {row.is_late ? <span className={`${styles.statusPill} ${styles.statusL}`}>Late {row.late_minutes}m</span> : null}
                    {Number(row.overtime_hours || 0) > 0 ? <span className={`${styles.statusPill} ${styles.statusOT}`}>OT {row.overtime_hours}h</span> : null}
                    <span className={styles.statusPill}>{formatMoney(row.penalty_amount)} penalty</span>
                    <span className={styles.statusPill}>{formatMoney(row.overtime_amount)} OT pay</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
}
