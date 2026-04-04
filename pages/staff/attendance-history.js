import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import DayDropdown from "../../components/DayDropdown";
import styles from "../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffOfflineRequest, staffRequest } from "@/lib/staffClient";
import { ArrowLeft, RefreshCw, User, UserCircle, UserCircle2, UserIcon } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { formatDisplayDate } from "../../lib/dateFormat";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function AttendanceHistory() {
  const { t } = useLanguage();
  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    staff_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    day: "",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchAttendance(false);
  }, [filters.staff_id, filters.month, filters.year, filters.day]);

  const daysInMonth = new Date(filters.year, filters.month, 0).getDate();

  const currentYear = new Date().getFullYear();
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }));
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((value) => ({
    value,
    label: String(value),
  }));
  const dayOptions = [
    { value: "", label: t("allDates") },
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      value: index + 1,
      label: String(index + 1),
    })),
  ];
  const staffOptions = [
    { value: "", label: t("allStaff") },
    ...staffList.map((row) => ({ value: row.id, label: row.name })),
  ];
  const selectedDate = filters.day
    ? `${filters.year}-${String(filters.month).padStart(2, "0")}-${String(filters.day).padStart(2, "0")}`
    : "";

  useEffect(() => {
    if (filters.day && Number(filters.day) > daysInMonth) {
      setFilters((prev) => ({ ...prev, day: "" }));
    }
  }, [daysInMonth, filters.day]);

  async function fetchStaff() {
    try {
      const data = await staffOfflineRequest("staff-list-v4", "/api/staff/list/", {
        method: "GET",
      });
      setStaffList(data || []);
    } catch (error) {
      toast.error(t("failedToLoadStaff"));
    }
  }

  async function fetchAttendance(forceRefresh) {
    try {
      setLoading(true);
      const payload = {
        staff_id: filters.staff_id,
        month: filters.month,
        year: filters.year,
        date: selectedDate,
      };
      const cacheKey = `staff-attendance-history-${filters.staff_id || "all"}-${filters.month}-${filters.year}-${selectedDate || "all"}-v4`;
      const response = forceRefresh
        ? await staffRequest("/api/staff/attendance/history/", { body: payload })
        : await staffOfflineRequest(cacheKey, "/api/staff/attendance/history/", {
            method: "POST",
            body: payload,
          });
      setAttendance(response?.data || []);
    } catch (error) {
      toast.error(t("failedToLoadAttendance"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title={t("attendanceHistory")}>
      <div className={styles.container}>
        <div className={styles.pageStack}>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>{t("attendance")}</p>
            <div className={styles.header}>

            <h1 className={styles.heroHeading}>{t("attendanceHistory")}</h1>
          <button type="button" className={styles.backBtn} onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> {t("back")}
          </button>
            </div>
            {/* <p className={styles.heroText}>{t("attendanceHistoryDescription")}</p> */}
          </section>

          <section className={styles.paymentFormCard}>
            <div className={styles.formGridCompact}>
              <div className={styles.formGroup}>
                <label>{t("staff")}</label>
                <DayDropdown
                  options={staffOptions}
                  value={filters.staff_id}
                  onChange={(value) => setFilters((prev) => ({ ...prev, staff_id: value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("month")}</label>
                <DayDropdown
                  options={monthOptions}
                  value={filters.month}
                  onChange={(value) => setFilters((prev) => ({ ...prev, month: Number(value) }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("year")}</label>
                <DayDropdown
                  options={yearOptions}
                  value={filters.year}
                  onChange={(value) => setFilters((prev) => ({ ...prev, year: Number(value) }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("date")}</label>
                <DayDropdown
                  options={dayOptions}
                  value={filters.day}
                  onChange={(value) => setFilters((prev) => ({ ...prev, day: value ? Number(value) : "" }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("refresh")}</label>
                <button type="button" className={styles.refreshBtn} onClick={() => fetchAttendance(true)}>
                  <RefreshCw size={16} /> {t("refreshData")}
                </button>
              </div>
            </div>
          </section>

          <section className={styles.timelineList}>
            {loading ? <div className={styles.emptyMsg}>{t("loading")}</div> : null}
            {!loading && attendance.length === 0 ? <div className={styles.emptyMsg}>{t("noAttendanceRecordsFound")}</div> : null}
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
                    <span>{formatDisplayDate(row.attendance_date)}</span>
                    <span>{t("inOutTime", { inTime: row.check_in ? String(row.check_in).slice(11, 16) : "--:--", outTime: row.check_out ? String(row.check_out).slice(11, 16) : "--:--" })}</span>
                  </div>
                  <div className={styles.statusLegend} style={{ marginTop: "0.5rem" }}>
                    {row.is_late ? <span className={`${styles.statusPill} ${styles.statusL}`}>{t("lateMinutes", { minutes: row.late_minutes })}</span> : null}
                    {Number(row.overtime_hours || 0) > 0 ? <span className={`${styles.statusPill} ${styles.statusOT}`}>{t("overtimeHours", { hours: row.overtime_hours })}</span> : null}
                    <span className={styles.statusPill}>{t("penaltyAmount", { amount: formatMoney(row.penalty_amount) })}</span>
                    <span className={styles.statusPill}>{t("overtimePayAmount", { amount: formatMoney(row.overtime_amount) })}</span>
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
