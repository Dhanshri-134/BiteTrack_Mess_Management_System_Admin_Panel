import { useEffect, useState } from "react";
import Scanner from "./scan"; // camera-based
import HardwareScanner from "../components/HardwareScanner"; // new
import styles from "../styles/attendance.module.css";
import Layout from "../components/Layout";

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ totalMembers: 0, todayAttendance: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(""); 
  const [recentUsers, setRecentUsers] = useState([]); 

  const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

  const fetchAttendance = async () => {
    try {
      // const res = await fetch("/api/attendance/fetch");
      const res = await fetch("/api/attendance/fetch", { headers: authHeaders() });
      // const res = await fetch(`/api/attendance/monthly?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch records");
      const data = await res.json();
      setRecords(data);

      const today = new Date().toISOString().slice(0, 10);
      const todayCount = data.filter((r) => r.att_date === today).length;

      // const membersRes = await fetch("/api/users/count");
      const membersRes = await fetch("/api/users/count", { headers: authHeaders() })
      const membersData = await membersRes.json();

      setStats({ totalMembers: membersData.count, todayAttendance: todayCount });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);



  // // handle scan result (camera + hardware)
  // const handleScan = async (qr) => {
  //   try {
  //     const res = await fetch("/api/attendance/mark", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ qr }),
  //     });
  //     const data = await res.json();

  //     if (res.ok) {
  //       setMessage(data.message || "Attendance marked successfully");

  //       // fetch the names of recently marked users
  //       const ids = qr.split("-").map((p) => Number(p)).filter(Boolean);
  //       const namesRes = await fetch("/api/users/names", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ userIds: ids }),
  //       });
  //       const namesData = await namesRes.json();
  //       setRecentUsers(namesData.names || []);
  //     } else {
  //       setMessage(data.error || "Failed to mark attendance");
  //       setRecentUsers([]);
  //     }

  //     fetchAttendance();
  //   } catch (err) {
  //     console.error("Error marking attendance:", err);
  //     setMessage("Something went wrong");
  //     setRecentUsers([]);
  //   }
  // };


  // handle scan result (camera + hardware)
const handleScan = async (qr) => {
  try {
    const res = await fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr }),
    });
    const data = await res.json();

    if (res.ok) {
      setMessage(data.message || "Attendance marked successfully");

      // extract single userId from QR
      const parts = qr.split("-");
      const userId = parts.length === 2 ? Number(parts[1]) : null;

      if (userId) {
        const namesRes = await fetch("/api/users/names", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: [userId] }), // single-element array
        });
        const namesData = await namesRes.json();
        setRecentUsers(namesData.names || []);
      } else {
        setRecentUsers([]);
      }
    } else {
      setMessage(data.error || "Failed to mark attendance");
      setRecentUsers([]);
    }

    fetchAttendance();
  } catch (err) {
    console.error("Error marking attendance:", err);
    setMessage("Something went wrong");
    setRecentUsers([]);
  }
};


// Split an array into N roughly equal chunks (columns)
function splitRecords(records, columns = 3) {
  const result = Array.from({ length: columns }, () => []);
  records.forEach((rec, i) => {
    result[i % columns].push(rec);
  });
  return result;
}





  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>Attendance Dashboard</h1>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles["stat-card"]}>
              <h3>Total Members</h3>
              <p>{stats.totalMembers}</p>
            </div>
            <div className={styles["stat-card"]}>
              <h3>Today's Attendance</h3>
              <p>{stats.todayAttendance}</p>
            </div>
          </div>
      {/* <button
              className={styles.generateButton}
              onClick={handleUpdateAttendance}
            >
              Update Attendance (Process Previous Day)
            </button> */}
          {/* Message banner */}
          {message && (
            <div className={styles.messageBanner}>
              <p>{message}</p>
              {recentUsers.length > 0 && (
                <p>Users marked: {recentUsers.join(", ")}</p>
              )}
            </div>
          )}

          {/* Scanner */}
          <section className={styles.scannerSection}>
            <h3 className={styles.scannerTitle}>Mark Attendance</h3>
            <p className={styles.scannerInstructions}>
              Scan student QR code using either a camera or Bluetooth scanner.
            </p>

            <div className={styles.scannerWrapper}>
              {/* Camera-based */}
              <Scanner onAttendanceMarked={handleScan} />

              {/* Hardware scanner */}
              <HardwareScanner onScan={handleScan} />
            </div>
          </section>

         {/* Attendance Table for a Specific Date, split into columns */}
{/* Attendance Table for a Specific Date, split into columns */}
<section>
  <h2>Attendance Record ({new Date().toISOString().slice(0, 10)})</h2>

  {loading ? (
    <div className={styles.loading}>Loading...</div>
  ) : records.filter(r => r.att_date === new Date().toISOString().slice(0, 10)).length === 0 ? (
    <div className={styles.empty}>No records for this date</div>
  ) : (
    (() => {
      const todayRecords = records.filter(r => r.att_date === new Date().toISOString().slice(0, 10));
      const chunks = splitRecords(todayRecords, 3); // 3-column layout

      return (
        <div className={styles.multiTableWrapper}>
          {chunks.map((chunk, colIdx) => (
            <table key={colIdx} className={styles.table}>
              <thead>
                <tr style={{ backgroundColor: "#1e293b", color: "#fff" }}>
                  <th>Sr. No.</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((r, idx) => (
                  <tr key={r.id}>
                    <td>{idx + colIdx * Math.ceil(todayRecords.length / 3) + 1}</td>
                    <td>{r.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      );
    })()
  )}
</section>



        </main>
      </div>
    </Layout>
  );
}
