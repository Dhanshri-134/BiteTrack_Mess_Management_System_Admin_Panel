//pages/leave.js
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import styles from "../styles/leave.module.css";

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState("requests");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveMembers, setLeaveMembers] = useState([]);

  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // const resRequests = await fetch("/api/leave/requests");
      // const resHistory = await fetch("/api/leave/history");
      const token = localStorage.getItem("token");

const resRequests = await fetch("/api/leave/requests", {
  headers: { Authorization: `Bearer ${token}` }
});
const resHistory = await fetch("/api/leave/history", {
  headers: { Authorization: `Bearer ${token}` }
});
const resMembers = await fetch("/api/leave/members", {
  headers: { Authorization: `Bearer ${token}` }
});

const membersData = await resMembers.json();

setLeaveMembers(membersData); // contains two lists


      setLeaveRequests(await resRequests.json());
      setLeaveHistory(await resHistory.json());
    } catch (err) {
      console.error("Error fetching leave data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>🏖 Leave Management</h1>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === "requests" ? styles.active : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            Leave Requests
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "members" ? styles.active : ""}`}
            onClick={() => setActiveTab("members")}
          >
            Leave Members
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "history" ? styles.active : ""}`}
            onClick={() => setActiveTab("history")}
          >
            Leave History
          </button>
        </div>

        {/* Table Container */}
        <div className={styles.tableContainer}>
          {loading ? (
            <p>Loading...</p>
          ) : activeTab === "requests" ? (
            <LeaveTable data={leaveRequests} type="requests" refresh={fetchData} />
          ) : activeTab === "history" ? (
            <LeaveTable data={leaveHistory} type="history" refresh={fetchData} />
          ) : (
            <LeaveMembers data={leaveMembers} />

          )}
        </div>
      </div>
    </Layout>
  );
}

function LeaveTable({ data, type, refresh }) {
  if (!data?.length) return <p className={styles.emptyState}>No records found.</p>;

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/leave/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, action }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.message || "Failed to update status");
        return;
      }

      alert(result.message);
      refresh();
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong");
    }
  };

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Contact</th>
          <th>Hostel</th>
          <th>From</th>
          <th>To</th>

          {type === "requests" && <th>Actions</th>}
          {type === "history" && <th>Status</th>}
        </tr>
      </thead>

      <tbody>
        {data.map((item) => (
          <tr key={item.id}>
            <td>{item.user_name}</td>
            <td>{item.email || item.user_email}</td>
            <td>{item.contact_no}</td>
            <td>{item.hostel_name}</td>
            <td>{item.from_date}</td>
            <td>{item.to_date}</td>

            {/* ACTION BUTTONS FOR REQUESTS */}
            {type === "requests" && (
              <td>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleAction(item.id, "Approved")}
                >
                  Approve
                </button>

                <button
                  className={styles.rejectBtn}
                  onClick={() => handleAction(item.id, "Rejected")}
                >
                  Reject
                </button>
              </td>
            )}

            {/* STATUS COLOR FOR HISTORY */}
            {type === "history" && (
              <td>
                <span
                  className={
                    item.status === "Approved"
                      ? styles.approved
                      : item.status === "Rejected"
                      ? styles.rejected
                      : styles.pending
                  }
                >
                  {item.status}
                </span>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function LeaveMembers({ data }) {
  if (!data) return <p>Loading...</p>;

  const { approved_members = [], excess_absent_members = [] } = data;

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>

      {/* APPROVED LEAVE MEMBERS */}
      <h2 className={styles.subTitle}>Approved Leave Members</h2>

{approved_members.length === 0 ? (
  <p className={styles.emptyState}>No approved leave members.</p>
) : (
  <div className={styles.tableWrapper}>
    <table className={`${styles.tables} ${styles.stickyTable}`}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Contact</th>
          <th>Hostel</th>
          <th>From</th>
          <th>To</th>
        </tr>
      </thead>
      <tbody>
        {approved_members.map((item) => (
          <tr key={item.id}>
            <td>{item.user_name}</td>
            <td>{item.user_email}</td>
            <td>{item.phone}</td>
            <td>{item.hostel_name}</td>
            <td>{formatDate(item.from_date)}</td>
            <td>{formatDate(item.to_date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}


      {/* EXCESS ABSENT MEMBERS */}
      <h2 className={styles.subTitle} style={{ marginTop: "30px" }}>
  Excess Absent Members
</h2>

{excess_absent_members.length === 0 ? (
  <p className={styles.emptyState}>No members exceeded absence limit.</p>
) : (
  <div className={styles.tableWrapper}>
    <table className={`${styles.table} ${styles.stickyTable}`}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Contact</th>
          <th>Absent Days</th>
          <th>Absent From</th>
          <th>Absent To</th>
        </tr>
      </thead>
      <tbody>
        {excess_absent_members.map((item) => (
          <tr key={item.user_id}>
            <td>{item.user_name}</td>
            <td>{item.user_email}</td>
            <td>{item.phone}</td>
            <td>
              <span className={styles.rejected}>
                {item.absent_count} Days
              </span>
            </td>
            <td>{formatDate(item.start_date)}</td>
            <td>{formatDate(item.end_date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

    </div>
  );
}
