import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/staff.module.css";
import Link from "next/link";
import { offlineFetch } from "@/lib/offlineFetch";
import { useLanguage } from "../../context/LanguageContext";
import {
  Users,
  UserCheck,
  Clock,
  Zap
} from "lucide-react";

export default function StaffDashboard() {

  const { t } = useLanguage();

  const [stats, setStats] = useState({
    total_staff: 0,
    present_today: 0,
    late_today: 0,
    overtime_today: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {

    const token = localStorage.getItem("token");

    try {

      const data = await offlineFetch("staff-dashboard", async () => {

        const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/staff/dashboard/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error();

        return res.json();
      });

      if (data) setStats(data);

    } catch (err) {
      console.error("Dashboard fetch failed");
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    {
      title: t("totalStaff"),
      value: stats.total_staff,
      icon: <Users size={22} />,
    },
    {
      title: t("presentToday"),
      value: stats.present_today,
      icon: <UserCheck size={22} />,
    },
    {
      title: t("lateToday"),
      value: stats.late_today,
      icon: <Clock size={22} />,
    },
    {
      title: t("overtimeToday"),
      value: stats.overtime_today,
      icon: <Zap size={22} />,
    },
  ];

  return (
    <Layout title="Staff Dashboard">

      <div className={styles.container}>

        <h2 className={styles.pageTitle}>
          {t("staffDashboard")}
        </h2>

        {/* STATS */}

        <div className={styles.cardGrid}>

          {cards.map((card, i) => (

            <div key={i} className={styles.card}>

              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>
                  {card.icon}
                </span>
                <p className={styles.cardTitle}>
                  {card.title}
                </p>
              </div>

              {loading ? (
                <div className={styles.skeleton}></div>
              ) : (
                <h3 className={styles.cardValue}>
                  {card.value}
                </h3>
              )}

            </div>

          ))}

        </div>


        {/* QUICK ACTIONS */}

        <div className={styles.actions}>

          <Link href="/staff/create" className={styles.actionBtn}>
            + {t("addStaff")}
          </Link>

          <Link href="/staff/list" className={styles.actionBtn}>
            {t("staffList")}
          </Link>

          <Link href="/staff/attendance" className={styles.actionBtn}>
            {t("staffAttendance")}
          </Link>

          <Link href="/staff/attendance-history" className={styles.actionBtn}>
            {t("attendanceHistory")}
          </Link>

        </div>

      </div>

    </Layout>
  );
}