import { useAppRefresh } from "@/lib/useAppRefresh";
import { useEffect, useState } from "react";
import Scanner from "./scan";
import HardwareScanner from "../../components/HardwareScanner";
import styles from "../../styles/attendance.module.css";
import Layout from "../../components/Layout";
import { offlineFetch } from "@/lib/offlineFetch";
import { queueAction } from "@/lib/queueAction";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter } from "next/router";
import { Trash2Icon } from "lucide-react";
import Link from "next/link";

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ totalMembers: 0, todayAttendance: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [recentUsers, setRecentUsers] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useLanguage();
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [searchAttendance, setSearchAttendance] = useState("");

  const [role, setRole] = useState(null);

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

  const todayRecords = records.filter(
    (r) =>
      r.att_date === today &&
    r.user_name?.toLowerCase().includes(searchAttendance.toLowerCase())
  );
  const chunks = splitRecords(todayRecords, 3);


  const filteredUsers = allUsers.filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const router = useRouter();

  const fetchUsersForAttendance = async () => {
    try {
      // setLoadingUsers(true);
      const data = await offlineFetch("verified-users", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/verified/",
          // "/api/users/verified/",
          { headers: authHeaders() }
        );

        if (!res.ok) throw new Error();
        return res.json();
      }
      );

      setAllUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchAttendance = async () => {
    try {
      const data = await offlineFetch("attendance-fetch", async () => {
        const res = await fetch(
          // "/api/attendance/fetch/",
          "https://bite-track-mess-management-system-a.vercel.app/api/attendance/fetch/",
          { headers: authHeaders() }
        );
        if (!res.ok) throw new Error("Failed to fetch records");
        return res.json();
      });

      setRecords(data);

      const today = new Date().toISOString().slice(0, 10);
      const todayCount = data.filter((r) => r.att_date === today).length;

      const membersData = await offlineFetch("users-count", async () => {
        const membersRes = await fetch(
          // "/api/users/count/",
          "https://bite-track-mess-management-system-a.vercel.app/api/users/count/",
          { headers: authHeaders() }
        );
        if (!membersRes.ok) throw new Error("Failed to fetch member count");
        return membersRes.json();
      });

      setStats({
        totalMembers: membersData.count,
        todayAttendance: todayCount,
      });
      console.log(data)
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMark = async (user) => {
    const today = new Date().toISOString().slice(0, 10);
    const alreadyMarked = records.some(
      (r) =>
        r.user_id === user.id &&
        r.att_date === today
    );

    if (alreadyMarked) {
      setMessage("Attendance already marked");
      setMarkModalOpen(false);
      setUserSearch(""); 
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("Invalid session");
        return;
      }

      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/attendance/owner-mark/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            att_date: today,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed");
        setMarkModalOpen(false); 
        return;
      }

      setMessage(data.message || t("attendanceMarked"));
      setRecentUsers([user.name]);
      setMarkModalOpen(false);
      useAppRefresh(fetchAttendance);

    } catch (err) {

      // 🚨 NETWORK FAILURE → OFFLINE MODE
      await queueAction({
        type: "OWNER_ATTENDANCE_MARK",
        payload: {
          user_id: user.id,
          att_date: today,
        },
      });

      // optimistic record
      setRecords((prev) => {
        const exists = prev.some(
          r => r.user_id === user.id && r.att_date === today
        );

        if (exists) return prev;

        return [
          ...prev,
          {
            id: `offline-owner-${Date.now()}`,
            user_id: user.id,
            user_name: user.name,
            att_date: today,
            source_type: "owner",
            paid: false,
          },
        ]
      });

      setStats((prev) => ({
        ...prev,
        todayAttendance: prev.todayAttendance + 1,
      }));

      setMessage(t("attendanceSavedOffline"));
      setMarkModalOpen(false);
    }
  };

  const handleDelete = async (attendance) => {
    if (!confirm("Are you sure you want to delete this attendance?")) return;

    const payload = {
      user_id: attendance.user_id,
      att_date: attendance.att_date,
    };

    try {
      const token = localStorage.getItem("token");

      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/delete/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to delete");
        return;
      }

      // remove from UI
      setRecords((prev) =>
        prev.filter(
          (r) =>
            !(r.user_id === attendance.user_id &&
              r.att_date === attendance.att_date)
        )
      );

      setStats((prev) => ({
        ...prev,
        todayAttendance: Math.max(0, prev.todayAttendance - 1),
      }));

      setMessage("Attendance deleted");

    } catch (err) {
      useAppRefresh(fetchAttendance);
      // OFFLINE SUPPORT
      await queueAction({
        type: "OWNER_ATTENDANCE_DELETE",
        payload,
      });

      setRecords((prev) =>
        prev.filter(
          (r) =>
            !(r.user_id === attendance.user_id &&
              r.att_date === attendance.att_date)
        )
      );

      setStats((prev) => ({
        ...prev,
        todayAttendance: Math.max(0, prev.todayAttendance - 1),
      }));

      setMessage("Deleted (will sync when online)");
    }
  };

  const handleScan = async (qr) => {
    const today = new Date().toISOString().slice(0, 10);

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        // "/api/attendance/mark/",
        "https://bite-track-mess-management-system-a.vercel.app/api/attendance/mark/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qr }),
        }
      );

      const data = await res.json();

      // ❗ Backend error — NOT offline
      if (!res.ok) {
        setMessage(data.error || "Failed");
        return;
      }

      // ✅ Success
      setMessage(data.message || t("attendanceMarked"));

      const parts = qr.split("-");
      const userId = parts.length === 2 ? Number(parts[1]) : null;

      if (userId) {
        const namesRes = await fetch(
          // "/api/users/names/",
          "https://bite-track-mess-management-system-a.vercel.app/api/users/names/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userIds: [userId] }),
          }
        );

        const namesData = await namesRes.json();
        setRecentUsers(namesData.names || []);
      }

      fetchAttendance();

    } catch (err) {
      // 🚨 ONLY NETWORK FAILURE COMES HERE
      console.log("CATCH ERROR:", err);

      await queueAction({
        type: "ATTENDANCE_SCAN",
        payload: { qr },
      });

      setMessage(t("attendanceSavedOffline"));

      const parts = qr.split("-");
      const userId = parts.length === 2 ? Number(parts[1]) : null;

      if (userId) {

        setRecords(prev => {
          const exists = prev.some(
            r => r.user_id === userId && r.att_date === today
          );

          if (exists) return prev;

          return [
            ...prev,
            {
              id: `offline-${Date.now()}`,
              user_id: userId,
              user_name: t("offlineUser"),
              att_date: today,
            },
          ];
        });
      }

      setRecentUsers([]);
    }
  };

  function splitRecords(records, columns = 3) {
    const result = Array.from({ length: columns }, () => []);
    records.forEach((rec, i) => {
      result[i % columns].push(rec);
    });
    return result;
  }

  /* ------------------ RESPONSIVE ------------------ */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);


  useEffect(() => {
    fetchAttendance();
  }, []);


  useAppRefresh(fetchAttendance);

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{t("attendance")}</h1>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles["stat-card"]}>
            {role !== "STAFF" ? (
  <Link href="/users/">
    <h3>{t("totalMembers")}</h3>
    <p>{stats.totalMembers}</p>
  </Link>
) : (
  <>
    <h3>{t("totalMembers")}</h3>
    <p>{stats.totalMembers}</p>
  </>
)}
            </div>
            <div className={styles["stat-card"]}>
              <h3>{t("todaysAttendance")}</h3>
              <p>{stats.todayAttendance}</p>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={styles.messageBanner}>
              <p>{message}</p>
              {recentUsers.length > 0 && (
                <p>
                  {t("usersMarked")}: {recentUsers.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* Scanner */}
          <section className={styles.scannerSection}>
            {/* <h3 className={styles.scannerTitle}>
              {t("markAttendance")}
            </h3> */}


            <button
              className={styles.markBtn}
              onClick={() => {
                setMarkModalOpen(true);
                fetchUsersForAttendance();
              }}
            >
              {t("markAttendance")}
            </button>

            <p className={styles.scannerInstructions}>
              {t("scannerInstructions")}
            </p>

            <div className={styles.scannerWrapper}>
              <Scanner onAttendanceMarked={handleScan} />
              <HardwareScanner onScan={handleScan} />
            </div>
          </section>

          {/* Attendance Table */}
          <section>
            <h2>
              {t("attendanceRecord")} ({today})
            </h2>
            <input
              type="text"
              placeholder="Search by name"
              value={searchAttendance}
              onChange={(e) => setSearchAttendance(e.target.value)}
              className={styles.searchInput}
            />

            {loading ? (
              <div className={styles.loading}>
                {t("loading")}
              </div>
            ) : todayRecords.length === 0 ? (
              <div className={styles.empty}>
                {t("noRecords")}
              </div>
            ) : isMobile ? (
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th>{t("srNo")}</th>
                      <th>{t("name")}</th>

                    </tr>
                  </thead>
                  <tbody>
                    {todayRecords.map((r, idx) => (
                      <tr key={r.id}>
                        <td>{idx + 1}</td>
                        <td
                        ><span
                          style={{ cursor: role === "STAFF" ? "default" : "pointer",}}
                          
                          onClick={() => {
                             if (role === "STAFF") return;
                            const today = new Date();
                            const month = String(today.getMonth() + 1).padStart(2, "0");
                            const year = today.getFullYear();

                            router.push(
                              `/billing?search=${encodeURIComponent(r.user_name)}`
                            );
                          }}
                        >
                            {r.user_name}
                          </span>
                          <div className={styles.user}>
                          {r.source_type === "owner" && (
                            <span className={styles.ownerBadge}>Owner</span>
                          )}
                          <span
                            className={
                              r.paid
                                ? styles.badgePaid
                                : styles.badgeUnpaid
                            }
                          >
                            {r.paid ? "Paid" : "Unpaid"}
                          </span>
                          {r.source_type === "owner" && (
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(r)}
                            >
                              Delete
                            </button>
                          )}
                          </div>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.tableScroll}>
                <div className={styles.multiTableWrapper}>
                  {chunks.map((chunk, colIdx) => (
                    <table key={colIdx} className={styles.table}>
                      <thead>
                        <tr className={styles.tableHeader}>
                          <th>{t("srNo")}</th>
                          <th>{t("status")}</th>
                          <th>{t("name")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.map((r, idx) => (
                          <tr key={r.id}>
                            <td>
                              {idx +
                                colIdx *
                                Math.ceil(todayRecords.length / 3) +
                                1}
                            </td>
                            <td
                              style={{ cursor: "pointer", color: "#2563EB" }}
                              onClick={() => {
                                if (role === "STAFF") return; 
                                const today = new Date();
                                const month = String(today.getMonth() + 1).padStart(2, "0");
                                const year = today.getFullYear();

                                router.push(
                                  `/billing?userId=${r.user_id}&month=${month}&year=${year}`
                                );
                              }}
                            >
                              {r.user_name}
                            </td>
                            <td>
                              {r.source_type === "owner" && (
                                <span className={styles.ownerBadge}>Owner</span>
                              )}
                              <span className={r.paid ? styles.badgePaid : styles.badgeUnpaid}>
                                {r.paid ? "Paid" : "Unpaid"}
                              </span>
                              {r.source_type === "owner" && (
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDelete(r)}
                            >
                              {t("Delete")}
                            </button>
                          )}
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {markModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.attendanceModal}>
            <div className={styles.modalHeader}>
              <h3>{t("markAttendance")}

              </h3>
              <button onClick={() => setMarkModalOpen(false)}>✕</button>
            </div>

            <input
              type="text"
              placeholder={t("searchByNameOrPhone")}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className={styles.searchInput}
            />

            {loadingUsers ? (
              <div className={styles.loading}>{t("loading")}</div>
            ) : (
              <div className={styles.userList}>
                {filteredUsers.map((u) => (
                  <div key={u.id} className={styles.userRow}>
                    <div>
                      <strong>{u.name}</strong>
                      <div className={styles.subText}>
                        {u.phone || "-"}
                      </div>
                    </div>

                    <button
                      className={styles.markUserBtn}
                      onClick={() => handleManualMark(u)}
                    >
                      {t("mark")}
                    </button>
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
