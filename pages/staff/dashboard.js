import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import styles from "../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { offlineFetch } from "@/lib/offlineFetch";
import { staffRequest } from "@/lib/staffClient";
import { ArrowLeft, ArrowRight, CalendarDays, CircleDollarSign, Clock3, UserCheck, UserPlus, Users } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    total_staff: 0,
    present_today: 0,
    late_today: 0,
    overtime_today: 0,
  });
  const [staff, setStaff] = useState([]);
  const [salary, setSalary] = useState([]);
  const [loading, setLoading] = useState(true);

  const { t } = useLanguage();
  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [statsData, staffList, salaryList] = await Promise.all([
        offlineFetch("staff-dashboard-v2", async () => {
          return staffRequest("/api/staff/dashboard/", { method: "GET" });
        }),
        offlineFetch("staff-list-v4", async () => {
          return staffRequest("/api/staff/list/", { method: "GET" });
        }),
        offlineFetch(`staff-salary-dashboard-${month}-${year}-v2`, async () => {
          return staffRequest("/api/staff/salary/list/", {
            body: { month, year },
          });
        }),
      ]);

      setStats(statsData || {});
      setStaff(staffList || []);
      setSalary(salaryList?.data || []);
    } catch (error) {
      toast.error("Failed to load staff dashboard");
    } finally {
      setLoading(false);
    }
  }

  const insights = useMemo(() => {
    const activeStaff = staff.filter((row) => row.is_active !== false);
    const currentBalance = activeStaff.reduce(
      (sum, row) => sum + Number(row.current_balance || 0),
      0
    );
    const totalPayroll = salary.reduce(
      (sum, row) => sum + Number(row.final_salary || 0),
      0
    );
    const overduePayroll = salary.filter(
      (row) => String(row.payment_status || "").toLowerCase() !== "paid"
    ).length;

    return {
      activeStaff: activeStaff.length,
      currentBalance,
      totalPayroll,
      overduePayroll,
    };
  }, [salary, staff]);

  const cards = [
    { label: "Active Staff", value: loading ? "..." : insights.activeStaff, icon: <Users size={18} /> },
    { label: "Present Today", value: loading ? "..." : stats.present_today || 0, icon: <UserCheck size={18} /> },
    { label: "Late Today", value: loading ? "..." : stats.late_today || 0, icon: <Clock3 size={18} /> },
    { label: "Overtime Today", value: loading ? "..." : stats.overtime_today || 0, icon: <CalendarDays size={18} /> },
  ];

  return (
    <Layout title="Staff Dashboard">
      <div className={styles.container}>
        <div className={styles.pageStack}>
          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>Staff</p>
            <div className={styles.header}>

              <h1 className={styles.heroTitle}>{t("dashboard")}</h1>
              <button
                className={styles.backBtn}
                onClick={() => router.back()}
              >
                ← Back
              </button>
            </div>
            <div className={styles.heroActions}>
              <Link href="/staff/create" className={styles.primaryBtn}>
                <UserPlus size={18} /> Add Staff
              </Link>
              <Link href="/staff/attendance" className={styles.actionBtn}>
                <CalendarDays size={18} /> Mark Attendance
              </Link>
            </div>
          </section>

          <section className={styles.insightGrid}>
            {cards.map((card) => (
              <div key={card.label} className={styles.insightCard}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <div className={styles.mutedText}></div>
              </div>
            ))}
          </section>

          <section className={styles.insightGrid}>
            <div className={styles.insightCard}>
              <span>Current Balance</span>
              <strong>{formatMoney(insights.currentBalance)}</strong>
              <div className={styles.mutedText}>Combined remaining balance across active staff.</div>
            </div>
            <div className={styles.insightCard}>
              <span>Monthly Payable</span>
              <strong>{formatMoney(insights.totalPayroll)}</strong>
              <div className={styles.mutedText}>Generated salary outstanding for the current month.</div>
            </div>
            <div className={styles.insightCard}>
              <span>Pending Salary Rows</span>
              <strong>{insights.overduePayroll}</strong>
              <div className={styles.mutedText}>Salary records not fully paid yet.</div>
            </div>
            <div className={styles.insightCard}>
              <span>Total Profiles</span>
              <strong>{stats.total_staff || 0}</strong>
              <div className={styles.mutedText}>Staff records scoped to the current mess.</div>
            </div>
          </section>

          <section className={styles.actionGrid}>
            <Link href="/staff/list" className={styles.actionLinkCard}>
              <span>Staff Directory</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/staff/attendance-history" className={styles.actionLinkCard}>
              <span>Attendance History</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/staff/salary/history" className={styles.actionLinkCard}>
              <span>Salary Management</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/staff/list" className={styles.actionLinkCard}>
              <span>Profile Analysis</span>
              <CircleDollarSign size={18} />
            </Link>
          </section>
        </div>
      </div>
    </Layout>
  );
}
