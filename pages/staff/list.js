import { useEffect, useState, useMemo } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import styles from "../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { offlineFetch } from "@/lib/offlineFetch";
import { useLanguage } from "../../context/LanguageContext";
import { staffRequest } from "@/lib/staffClient";
import { Search, UserPlus, CheckCircle, XCircle, Clock } from "lucide-react";

export default function StaffList() {
  const { t } = useLanguage();
  const router = useRouter();

  const [staff, setStaff] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStaffAndStats();
  }, []);

  async function fetchStaffAndStats() {
    try {
      setLoading(true);

      const staffData = await offlineFetch("staff-list", async () => {
        const res = await staffRequest("/api/staff/list/", { method: "GET" });
        return res;
      });
      setStaff(staffData || []);

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const attendanceRes = await staffRequest("/api/staff/attendance/history/", {
        method: "POST",
        body: { month, year }
      });

      if (attendanceRes.success) {
        const map = {};
        attendanceRes.data.forEach(r => {
          const sid = r.staff_id;
          if (!map[sid]) {
            map[sid] = { present: 0, absent: 0, late: 0 };
          }
          if (r.attendance_type === "P" || r.attendance_type === "H") map[sid].present++;
          if (r.attendance_type === "A") map[sid].absent++;
          if (r.is_late) map[sid].late++;
        });
        setStatsMap(map);
      }

    } catch (err) {
      toast.error("Unable to load staff data");
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((s) =>
      (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search)
    );
  }, [staff, search]);

  return (
    <Layout title="Staff List">
      <div className={styles.container}>
        
        <section className={styles.heroPanel}>
                    <p className={styles.heroKicker}>Staff</p>
                    <div className={styles.header}>
                      <h1 className={styles.heroTitle}>{t("staffList", "Staff Management")}</h1>
                      <button
                        className={styles.backBtn}
                        onClick={() => router.back()}
                      >
                        ← Back
                      </button>
                    </div>
          <button 
            className={styles.addstaff} 
            onClick={() => router.push("/staff/create")}
          >
            <UserPlus size={18} /> {t("addStaff", "Add Staff")}
          </button>

                    </section>
<br></br>
        <div className={styles.searchContainer} style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            className={styles.searchInput}
            style={{ paddingLeft: "40px" }}
            placeholder={t("searchStaff", "Search by name or phone...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className={styles.loadingText}>{t("loading", "Loading")}...</p>
        ) : (
          <div className={styles.cardList}>
            {filteredStaff.length === 0 && (
              <div className={styles.emptyState}>{t("noData", "No staff found.")}</div>
            )}
            {filteredStaff.map((s) => {
              const st = statsMap[s.id] || { present: 0, absent: 0, late: 0 };
              return (
                <div 
                  key={s.id} 
                  className={styles.staffCard} 
                  onClick={() => router.push(`/staff/profile/${s.id}`)}
                >
                  <div className={styles.staffCardHeader}>
                    <div>
                      <h3 className={styles.staffName}>{s.name}</h3>
                      <p className={styles.staffPhone}>{s.phone || "No phone provided"}</p>
                    </div>
                    <div className={styles.staffRoleBadge}>{s.role || "Staff"}</div>
                  </div>

                  <div className={styles.staffCardStatsRow}>
                    <div className={styles.statPill} style={{ background: "#dcfce7", color: "#166534" }}>
                      <CheckCircle size={14}/> {st.present} P
                    </div>
                    <div className={styles.statPill} style={{ background: "#fee2e2", color: "#991b1b" }}>
                      <XCircle size={14}/> {st.absent} A
                    </div>
                    <div className={styles.statPill} style={{ background: "#fef9c3", color: "#854d0e" }}>
                      <Clock size={14}/> {st.late} L
                    </div>
                  </div>

                  <div className={styles.staffCardBalance}>
                    <span className={styles.balanceLabel}>Balance</span>
                    <span className={styles.balanceAmount}>
                      ₹ {Number(s.current_balance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}