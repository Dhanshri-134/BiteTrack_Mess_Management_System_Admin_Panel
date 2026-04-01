import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus,CalendarDays, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { useLanguage } from "../../context/LanguageContext";
import { offlineFetch } from "@/lib/offlineFetch";
import { staffRequest } from "@/lib/staffClient";
import styles from "../../styles/staffMobile.module.css";
import Link from "next/link";

const EMPTY_STATS = { present: 0, absent: 0, leave: 0, halfDay: 0 };

export default function StaffList() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchStaffAndStats();
  }, []);

  async function fetchStaffAndStats() {
    try {
      setLoading(true);

      const staffData = await offlineFetch("staff-list-v2", async () => {
        return staffRequest("/api/staff/list/", { method: "GET" });
      });
      setStaff(Array.isArray(staffData) ? staffData : []);

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const attendanceRes = await staffRequest("/api/staff/attendance/history/", {
        method: "POST",
        body: { month, year },
      });

      if (attendanceRes.success) {
        const map = {};
        attendanceRes.data.forEach((row) => {
          const staffId = row.staff_id;
          const attendanceType = String(row.attendance_type || "").toUpperCase();

          if (!map[staffId]) {
            map[staffId] = { ...EMPTY_STATS };
          }

          if (attendanceType === "P") map[staffId].present += 1;
          else if (attendanceType === "A") map[staffId].absent += 1;
          else if (attendanceType === "L") map[staffId].leave += 1;
          else if (attendanceType === "H" || attendanceType === "HF") map[staffId].halfDay += 1;
        });
        setStatsMap(map);
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to load staff data");
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = useMemo(() => {
    const query = search.toLowerCase();
    return staff.filter((member) =>
      (member.name || "").toLowerCase().includes(query) ||
      (member.phone || "").includes(search)
    );
  }, [staff, search]);

  async function toggleStaffStatus(member, event) {
    event.stopPropagation();

    try {
      setSavingId(member.id);
      await staffRequest("/api/staff/toggleActive/", {
        body: {
          id: member.id,
          is_active: member.is_active === false,
        },
      });

      setStaff((prev) =>
        prev.map((row) =>
          row.id === member.id
            ? { ...row, is_active: row.is_active === false ? true : false }
            : row
        )
      );

      toast.success(member.is_active === false ? "Staff activated" : "Staff deactivated");
    } catch (error) {
      toast.error("Failed to update staff status");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Layout title={t("staffList")}>
      <div className={styles.container}>
        <section className={styles.heroPanel}>
          <p className={styles.heroKicker}>{t("staff")}</p>
          <div className={styles.header}>
            <h1 className={styles.heroHeading}>{t("Staff List")}</h1>
            <button className={styles.backBtn} onClick={() => window.history.back()}>
             <ArrowLeft size={16}/> Back
            </button>
          </div>
          <br></br>
          <div className={styles.header}>

          <button className={styles.addstaff} onClick={() => (window.location.href = "/staff/create")}>
            <UserPlus size={18} /> {t("addStaff", "Add Staff")}
          </button>
          <Link href="/staff/attendance" className={styles.actionBtn}>
                <CalendarDays size={18} /> {t("markAttendance")}
              </Link>
          </div>
        </section>

        <br />

        <div className={styles.searchContainer} style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            className={styles.searchInput}
            style={{ paddingLeft: "40px" }}
            placeholder={t("Search by name or phone...")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className={styles.emptyMsg}>{t("loading", "Loading")}...</p>
        ) : (
          <div className={styles.cardList}>
            {filteredStaff.length === 0 ? (
              <div className={styles.emptyMsg}>{t("noData", "No staff found.")}</div>
            ) : filteredStaff.map((member) => {
              const stats = statsMap[member.id] || EMPTY_STATS;
              return (
                <div
                  key={member.id}
                  className={styles.staffCard}
                  onClick={() => (window.location.href = `/staff/profile/${member.id}`)}
                >
                  <div className={styles.staffCardHeader}>
                    <div>
                      <h3 className={styles.staffName}>{member.name}</h3>
                      <p className={styles.staffPhone}>{member.phone || "No phone provided"}</p>
                    </div>
                    <div className={styles.staffBadgeRow}>
                      <div className={styles.staffRoleBadge}>{member.role || "Staff"}</div>
                      <div className={`${styles.profileMetaPill} ${member.is_active === false ? styles.profileStatusInactive : styles.profileStatusActive}`}>
                        {member.is_active === false ? "Inactive" : "Active"}
                      </div>
                    </div>
                  </div>

                  <div className={styles.staffCardStatsRow}>
                    <div className={styles.statPill} style={{ background: "#dcfce7", color: "#166534" }}>P {stats.present}</div>
                    <div className={styles.statPill} style={{ background: "#fee2e2", color: "#991b1b" }}>A {stats.absent}</div>
                    <div className={styles.statPill} style={{ background: "#ffedd5", color: "#c2410c" }}>L {stats.leave}</div>
                    <div className={styles.statPill} style={{ background: "#fef3c7", color: "#b45309" }}>HF {stats.halfDay}</div>
                  </div>

                  <div className={styles.staffCardBalance}>
                    <span className={styles.balanceLabel}>{t("balance")}</span>
                    <span className={styles.balanceAmount}> {Number(member.current_balance || 0).toLocaleString()}</span>
                  </div>
                  <div className={styles.staffCardActions}>
                    <button
                      type="button"
                      className={styles.statusToggleBtn}
                      onClick={(event) => toggleStaffStatus(member, event)}
                      disabled={savingId === member.id}
                    >
                      {savingId === member.id ? "Saving..." : member.is_active === false ? "Activate" : "Deactivate"}
                    </button>
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
