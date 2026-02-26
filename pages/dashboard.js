import { useAppRefresh } from "@/lib/useAppRefresh";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Card from "../components/Card";
import styles from "../styles/dashboardmain.module.css";
import Layout from "../components/Layout";
import { offlineFetch } from "@/lib/offlineFetch";
import { useLanguage } from "../context/LanguageContext";
import { Eye, EyeOff, CalendarDays, Wallet } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar} from "recharts";
import { PieChart, Pie, Cell, Legend } from "recharts";
import Link from "next/link";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
  });
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [messAccess, setMessAccess] = useState(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
    const [rawAttendance, setRawAttendance] = useState([]);
    const hasAccess = (key) => {
    if (!messAccess) return true;
    return messAccess[key] !== false;
  };
  const [alerts, setAlerts] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState({
    dailyTrend: [],
    monthlyTrend: [],
    yearlyTrend: [],
  });
  const [foodUsers, setFoodUsers] = useState([]);
  const [foodModal, setFoodModal] = useState({
    open: false,
    type: null,
    users: [],
  });
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [trendType, setTrendType] = useState("daily");
  const [foodStats, setFoodStats] = useState({ veg: 0, nonveg: 0 });
  const [mess, setMess] = useState(null);
  const [role, setRole] = useState(null);
  const [showMonthlyRevenue, setShowMonthlyRevenue] = useState(false);
  const attendanceData = 
    trendType === "daily"
      ? attendanceTrend.dailyTrend
      : trendType === "monthly"
        ? attendanceTrend.monthlyTrend
        : attendanceTrend.yearlyTrend;
  const [fastingStats, setFastingStats] = useState({
    total: 0,
    today: 0,
    monthly: 0,
  });
  const [foodSearch, setFoodSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setRole(payload.role || "OWNER");
    } catch {
      setRole("OWNER");
    }
  }, []);

  const getToken = () => localStorage.getItem("token");

  const fetchFastingStats = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const data = await offlineFetch("fasting-requests", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/menu/fasting/fetch/",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("fasting fetch failed");
        return await res.json();
      }) ?? { todayCount: 0, totalRequests: 0 };

      setFastingStats({
        total: data.totalRequests || 0,
        today: data.todayCount || 0,
        monthly: 0, // remove if not needed
      });

    } catch (err) {
      console.error("Fasting stats error:", err);
      setFastingStats({ total: 0, today: 0, monthly: 0 });
    }
  };

  const fetchFoodStats = async () => {
    try {
      const token = getToken();
      if (!token) {
        console.warn("No token present — cannot fetch food stats");
        return;
      }

      const data = await offlineFetch("food-preference", async () => {
        const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/foodPreference/", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch food stats");
        return data;
      }) ?? { veg: 0, nonveg: 0 };
      setFoodStats({
        veg: data.veg || 0,
        nonveg: data.nonveg || 0,
      });

      setFoodUsers(data.users || []); 
    } catch (err) {
      console.error("Food stats unavailable offline", err);
    }
  };

  const fetchMessInfo = async () => {
    try {
      const token = getToken();
      const data = await offlineFetch("mess-info", async () => {
        if (!token) return console.warn("Session expired! Please login again.");

        const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/mess/info/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          setMess(data);
        } else {
          console.error(data.error);
        }
        return data;
      }) ?? null;
      if (data) setMess(data);

    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const [attendanceModal, setAttendanceModal] = useState({
    open: false,
    date: null,
    users: [],
  });

  const fetchStats = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1; 
      const year = now.getFullYear();

      const token = getToken();
      if (!token) return;

      const usersData = await offlineFetch("users-count", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/count/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("users/count failed");
        return res.json();
      }) ?? { count: 0 };

      const attendanceData = await offlineFetch("attendance-fetch", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/attendance/fetch/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("attendance/fetch failed");
        return res.json();
      }) || [];

      const billsAllData = await offlineFetch("bills-all", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/bills/all/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("bills/all failed");
        return res.json();
      }) || [];

      const billsMonthlyData = await offlineFetch(
        `dashboard-bills-${month}-${year}`,
        async () => {
          const res = await fetch(
            `https://bite-track-mess-management-system-a.vercel.app/api/bills/fetch/?month=${month}&year=${year}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) throw new Error("bills/fetch failed");
          return res.json();
        }
      ) || [];

      const getDateFromObj = (obj) => {
        if (!obj) return null;

        if (obj.end_date) return new Date(obj.end_date);
        if (obj.start_date) return new Date(obj.start_date);

        const keys = ["generated_at", "bill_date", "date", "created_at"];
        for (const k of keys) {
          if (obj[k]) {
            const d = new Date(obj[k]);
            if (!isNaN(d)) return d;
          }
        }
        return null;
      };

      const today = new Date().toISOString().slice(0, 10);
      const todayCount = attendanceData.filter((r) => {
        const att = r.att_date ? new Date(r.att_date).toISOString().slice(0, 10) : null;
        return att === today;
      }).length;

      const totalRevenue = billsAllData.reduce(
        (sum, b) => sum + Number(b.total_amount || b.amount || 0),
        0
      );

      const monthlyRevenue = billsMonthlyData.reduce(
        (sum, b) => sum + Number(b.total_amount || b.amount || 0),
        0
      );

      const uniqueUsers = [...new Set(attendanceData.map((r) => r.user_id))];
      const inactiveCount = uniqueUsers.filter((uid) => {
        const records = attendanceData.filter((r) => r.user_id === uid);
        const lastSeenMs = Math.max(
          ...records.map((r) => {
            const d = getDateFromObj(r);
            return d ? d.getTime() : 0;
          })
        );
        if (lastSeenMs === 0) return true; // never seen -> consider inactive
        return (new Date() - new Date(lastSeenMs)) / (1000 * 60 * 60 * 24) > 10;
      }).length;

      const alertsList =
        inactiveCount > 0
          ? [`⚠️ ${inactiveCount} members inactive for 10+ days`]
          : [];

      const buildTrends = (data) => {
        const now = new Date();
        const getDateKey = (r) => {
          if (!r) return null;
          if (r.att_date) return new Date(r.att_date);
          return getDateFromObj(r);
        };

        const dailyTrend = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dayKey = d.toISOString().slice(0, 10);
          const count = data.filter((r) => {
            const dt = getDateKey(r);
            return dt && dt.toISOString().slice(0, 10) === dayKey;
          }).length;
          return {
            label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            attendance: count,
          };
        });

        const monthlyTrend = [...Array(6)].map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          const month = d.getMonth();
          const year = d.getFullYear();
          const count = data.filter((r) => {
            const dt = getDateKey(r);
            return dt && dt.getMonth() === month && dt.getFullYear() === year;
          }).length;
          return {
            label: d.toLocaleDateString("en-IN", { month: "short" }),
            attendance: count,
          };
        });

        const yearlyTrend = [...Array(3)].map((_, i) => {
          const year = now.getFullYear() - (2 - i);
          const count = data.filter((r) => {
            const dt = getDateKey(r);
            return dt && dt.getFullYear() === year;
          }).length;
          return { label: `${year}`, attendance: count };
        });

        return { dailyTrend, monthlyTrend, yearlyTrend };
      };

      const { dailyTrend, monthlyTrend, yearlyTrend } = buildTrends(attendanceData);
      setAttendanceTrend({ dailyTrend, monthlyTrend, yearlyTrend });

      // --- Monthly Revenue Trend ---
      const revTrend = [...Array(6)].map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const month = d.getMonth();
        const year = d.getFullYear();

        const revenue = billsAllData
          .filter((b) => {
            const billDate = getDateFromObj(b);
            return billDate && billDate.getMonth() === month && billDate.getFullYear() === year;
          })
          .reduce((sum, b) => sum + Number(b.total_amount || b.amount || 0), 0);

        return {
          month: d.toLocaleDateString("en-IN", { month: "short" }),
          revenue: parseFloat(revenue.toFixed(2)),
        };
      });

      const buildRevenueTrend = (bills) => {
        if (!bills || bills.length === 0) return [];

        const monthsSet = new Set();
        bills.forEach(b => {
          if (b.year && b.month != null) {
            monthsSet.add(`${b.year}-${b.month}`);
          }
        });

        const monthsArray = Array.from(monthsSet)
          .map(m => {
            const [year, month] = m.split("-").map(Number);
            return { year, month };
          })
          .sort((a, b) => a.year - b.year || a.month - b.month);

        const trend = monthsArray.map(({ year, month }) => {
          const revenue = bills
            .filter(b => b.year === year && b.month === month)
            .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

          const monthLabel = new Date(year, month - 1).toLocaleString("en-IN", { month: "short", year: "numeric" });

          return { month: monthLabel, revenue: parseFloat(revenue.toFixed(2)) };
        });

        return trend;
      };

      setRevenueTrend(buildRevenueTrend(billsAllData));

      setStats({
        totalMembers: usersData.count || 0,
        todayAttendance: todayCount,
        monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      });

      setRawAttendance(attendanceData);


      setAlerts(alertsList);
    } catch (err) {
      console.error("Error fetching stats:", err);

      setAttendanceTrend({
        dailyTrend: [],
        monthlyTrend: [],
        yearlyTrend: [],
      });

      setRevenueTrend([]);
      setStats({
        totalMembers: 0,
        todayAttendance: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
      });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchAccess = async () => {
      try {
        const data = await offlineFetch("mess-access", async () => {
          const res = await fetch(
            "/api/mess/access/",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) throw new Error("Failed to fetch access");
          return res.json();
        });

        setMessAccess(data || {});
      } catch (err) {
        console.error("Access unavailable offline");
        setMessAccess({});
      } finally {
        setLoadingAccess(false);
      }
    };

    fetchAccess();
  }, []);

  const fetchData = async () => {
    await Promise.allSettled([
      fetchMessInfo(),
      fetchStats(),
      fetchFoodStats(),
      fetchFastingStats(),
    ]);
  }
  
  useEffect(() => {
    setLoading(false);
    fetchData();
  }, []);

  useAppRefresh(fetchData);

  useEffect(() => {
    const sections = document.querySelectorAll(`.${styles.section}`);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles["is-visible"]);
            observer.unobserve(entry.target); // animate only once
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    sections.forEach(section => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const router = useRouter();

  const filteredFoodUsers = foodModal.users.filter(u =>
    u.name?.toLowerCase().includes(foodSearch.toLowerCase()) ||
    u.phone?.toLowerCase().includes(foodSearch.toLowerCase())
  );

  const filteredAttendanceUsers = attendanceModal.users.filter(u =>
    u.user_name?.toLowerCase().includes(attendanceSearch.toLowerCase())
  );
  
  return (
    <Layout>
      <div className={styles.dashboard}>
        <main className={styles.main}>
          <h1>{t("dashboardOverview")}</h1>

            <div className={styles.cards}>
              {role !== "STAFF" ? (
                <Link href="/users/">
                  <Card title={t("totalMembers")} value={stats.totalMembers} />
                </Link>
              ) : (
                <Card title={t("totalMembers")} value={stats.totalMembers} />
              )}

              <Link href="/attendance/">
                <Card
                  title={t("todaysAttendance")}
                  value={stats.todayAttendance}
                />
              </Link>

              {hasAccess("fasting") && (
                <Link href="/menu?tab=FastingRequests">
                  <Card
                    title={t("fastingRequests")}
                    value={fastingStats.today}
                  />
                </Link>
              )}

              <Card
                title={
                  <span className={styles.cardTitleWithIcon}>
                    {t("monthlyRevenue")}
                  </span>
                }
                value={
                  role === "STAFF"
                    ? "₹ ••••••"
                    : showMonthlyRevenue
                      ? `₹ ${stats.monthlyRevenue.toFixed(2)}`
                      : "₹ ••••••"
                }
                extra={
                  role !== "STAFF" && (
                    <span
                      className={styles.eyeIcon}
                      onClick={() => setShowMonthlyRevenue((p) => !p)}
                    >
                      {showMonthlyRevenue ? <EyeOff size={18} /> : <Eye size={18} />}
                    </span>
                  )
                }
              />

              {/*

         <Card
  title={
    <span className={styles.cardTitleWithIcon}>
      {t("totalRevenue")}
    </span>
  }
  value={
    role === "STAFF"
      ? "₹ ••••••"
      : showTotalRevenue
        ? `₹ ${stats.totalRevenue.toFixed(2)}`
        : "₹ ••••••"
  }
  extra={
    role !== "STAFF" && (
      <span
        className={styles.eyeIcon}
        onClick={() => setShowTotalRevenue((p) => !p)}
      >
        {showTotalRevenue ? <EyeOff size={18} /> : <Eye size={18} />}
      </span>
    )
  }
/> */}


            </div>

          {/* Attendance Trend */}
          <section className={styles.section}>
            <div className={styles.trendHeader}>
              <h2 className={styles.sectionTitle}>
                {t("attendanceTrend")}
              </h2>

              <div className={styles.trendTabs}>
                {["daily", "monthly", "yearly"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTrendType(type)}
                    className={`${styles.trendTab} ${trendType === type ? styles.trendTabActive : ""
                      }`}
                  >
                    {t(type)}
                  </button>
                ))}

                <div
                  className={`${styles.trendActiveBg} ${trendType === "daily"
                    ? styles.dailyActive
                    : trendType === "monthly"
                      ? styles.monthlyActive
                      : styles.yearlyActive
                    }`}
                />
              </div>
            </div>


            {attendanceData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={
                    trendType === "daily"
                      ? attendanceTrend.dailyTrend
                      : trendType === "monthly"
                        ? attendanceTrend.monthlyTrend
                        : attendanceTrend.yearlyTrend
                  }
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar
  dataKey="attendance"
  fill="#0f766e"
  radius={[10, 10, 0, 0]}
  onClick={(data, index) => {
    if (trendType !== "daily") return;

    const selectedDate = new Date();
    selectedDate.setDate(selectedDate.getDate() - (6 - index));
    const dateStr = selectedDate.toISOString().slice(0, 10);

    const users = rawAttendance.filter(r => {
      const att = r.att_date
        ? new Date(r.att_date).toISOString().slice(0, 10)
        : null;
      return att === dateStr;
    });

    setAttendanceModal({
      open: true,
      date: dateStr,
      users,
    });
  }}
/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No attendance data</p>
            )}
          </section>

          {/* Revenue Trend */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t("revenueTrendLast6Months")}
            </h2>
            {revenueTrend?.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height={300}
                className={styles.trendCharts}
              >
                <LineChart
                  data={revenueTrend}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No revenue data</p>
            )}
          </section>

          {/* Meal Preference Overview */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t("mealPreferenceOverview")}
            </h2>

            <div className={styles.foodStatsCard}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: t("veg"), value: foodStats.veg },
                      { name: t("nonVeg"), value: foodStats.nonveg },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={85}
                    outerRadius={120}
                    startAngle={90}
                    endAngle={450}
                    dataKey="value"
                    stroke="none"
                    animationDuration={900}
                    labelLine={false}
                  >
                    <Cell fill="#22C55E" />
                    <Cell fill="#ef4444" />
                  </Pie>

                  <text
                    x="50%"
                    y="48%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="28"
                    fontWeight="700"
                    fill="#0F172A"
                  >
                    {foodStats.veg + foodStats.nonveg}
                  </text>

                  <text
                    x="50%"
                    y="60%"
                    textAnchor="middle"
                    fontSize="14"
                    fill="#64748B"
                  >
                    {t("totalMembers")}
                  </text>
                </PieChart>
              </ResponsiveContainer>

              <div className={styles.foodSummary}>
                <div
                  className={`${styles.summaryItem} ${foodStats.veg > foodStats.nonveg ? styles.major : ""
                    }`}
                >
                  <div className={styles.legendHeader}>
                    <span className={styles.vegDot}></span>
                    <strong>{t("veg")}</strong>
                  </div>
                  <p
  className={styles.summaryCount}
  style={{ cursor: "pointer" }}
  onClick={() => {
    const vegUsers = foodUsers.filter(u => u.food_preference === "veg");

setFoodModal({
  open: true,
  type: "Veg",
  users: vegUsers,
});
setFoodSearch(""); 
  }}
>
  {foodStats.veg}
</p>
                  <p className={styles.summaryPercent}>
                    {Math.round(
                      (foodStats.veg /
                        (foodStats.veg + foodStats.nonveg || 1)) *
                      100
                    )}
                    %
                  </p>
                </div>

                <div
                  className={`${styles.summaryItem} ${foodStats.nonveg > foodStats.veg ? styles.major : ""
                    }`}
                >
                  <div className={styles.legendHeader}>
                    <span className={styles.nonVegDot}></span>
                    <strong>{t("nonVeg")}</strong>
                  </div>
                  <p
  className={styles.summaryCount}
  style={{ cursor: "pointer" }}
  onClick={() => {
    const nonVegUsers = foodUsers.filter(u => u.food_preference === "nonveg");

    setFoodModal({
      open: true,
      type: "Non-Veg",
      users: nonVegUsers,
    });

setFoodSearch(""); // reset search
  }}
>
  {foodStats.nonveg}
</p>
                  <p className={styles.summaryPercent}>
                    {Math.round(
                      (foodStats.nonveg /
                        (foodStats.veg + foodStats.nonveg || 1)) *
                      100
                    )}
                    %
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Mess Info */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("messInfo")}</h2>

            {!mess ? (
              <p>{t("loading")}</p>
            ) : (
              <div className={styles.profileCard}>
                <p>
                  <strong>{t("messName")}:</strong> {mess.name}
                </p>
                <p>
                  <strong>{t("email")}:</strong> {mess.email}
                </p>
                <p>
                  <strong>{t("phone")}:</strong> {mess.contact_info}
                </p>
                <p>
                  <strong>{t("address")}:</strong> {mess.location}
                </p>
                <p>
                  <strong>{t("workingHours")}:</strong> {mess.open_time}
                </p>
                <p>
                  <strong>{t("perDayRate")}:</strong> ₹
                  {Number(mess.per_day_rate || 0).toFixed(2)}
                </p>
              </div>
            )}
          </section>

        </main>
      </div>



      {attendanceModal.open && (
  <div className={styles.modalOverlay}>
    <div className={styles.attendanceModal}>
      <div className={styles.modalHeader}>
        <h3>
          Attendance List ({attendanceModal.date})
        </h3>
        <button onClick={() =>{
          setAttendanceModal({ open: false, date: null, users: [] })
          setAttendanceSearch("");
        }
        }>
          ✕
        </button>
      </div>
      <input
  type="text"
  placeholder="Search student..."
  value={attendanceSearch}
  onChange={(e) => setAttendanceSearch(e.target.value)}
  className={styles.searchInput}
/>

      {filteredAttendanceUsers.length === 0 ? (
        <p>No students attended</p>
      ) : (
        <div className={styles.userList}>
          {filteredAttendanceUsers.map((u, i) => (
            <div key={i} className={styles.userRow}>
              <strong>{u.user_name}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
{foodModal.open && (
  
  <div className={styles.modalOverlay}>
    <div className={styles.attendanceModal}>
      <div className={styles.modalHeader}>
        <h3>{foodModal.type} Members</h3>
        <button
          onClick={() =>
            setFoodModal({ open: false, type: null, users: [] })
          }
        >
          ✕
        </button>
      </div>
      
 <input
        type="text"
        placeholder="Search by name or phone..."
        value={foodSearch}
        onChange={(e) => setFoodSearch(e.target.value)}
        className={styles.searchInput}
      />
      {filteredFoodUsers.length === 0 ? (
        <p>No members found</p>
      ) : (
        <div className={styles.userList}>
          {filteredFoodUsers.map((u, i) => (
            <div key={i} className={styles.userRow}>
              <strong>{u.name}</strong>
              <div style={{ fontSize: "12px", color: "#64748B" }}>
                {u.phone || "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
    </Layout>
  );
}
