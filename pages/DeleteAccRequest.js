import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/deleteRequests.module.css";

export default function DeleteRequests() {
  const [requests, setRequests] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("requests");
  const [loading, setLoading] = useState(true);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toISOString().split("T")[0];
  };

  // Fetch both:
  // 1️⃣ delete account requests
  // 2️⃣ inactive users list
  const fetchAll = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      // Fetch delete requests
      const reqRes = await fetch("/api/accountDeletion/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const reqData = await reqRes.json();

      // Fetch inactive users
      const inactiveRes = await fetch("/api/users/inactive", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const inactiveData = await inactiveRes.json();

      if (!reqRes.ok) throw new Error(reqData.error);
      if (!inactiveRes.ok) throw new Error(inactiveData.error);

      setRequests(reqData.filter((r) => r.status === "pending"));
      setInactiveUsers(inactiveData.data || []);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Update request status (Approve / Reject)
  const updateStatus = async (id, status) => {
    if (!confirm(`Mark this request as ${status}?`)) return;

    try {
      const res = await fetch(`/api/accountDeletion/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchAll();
    } catch (err) {
      alert("Error updating request: " + err.message);
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1>🗑 Delete Account Management</h1>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "requests" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("requests")}
          >
            Requests
          </button>

          <button
            className={`${styles.tab} ${
              activeTab === "inactive" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("inactive")}
          >
            Inactive Members
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : activeTab === "requests" ? (
          // 🔵 PENDING REQUESTS TABLE
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Email</th>
                <th>Reason</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6">No pending requests.</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.user_name}</td>
                    <td>{r.user_email}</td>
                    <td>{r.reason || "-"}</td>
                    <td>{formatDate(r.requested_at)}</td>
                    <td className={styles.actions}>
                      <button
                        className={styles.approve}
                        onClick={() => updateStatus(r.id, "approved")}
                      >
                        Approve
                      </button>

                      <button
                        className={styles.reject}
                        onClick={() => updateStatus(r.id, "rejected")}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          // 🔴 INACTIVE USERS TABLE — NO ACTION BUTTONS
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Hostel</th>
                <th>Room</th>
                <th>Course</th>
                <th>Date of Joining</th>
              </tr>
            </thead>

            <tbody>
              {inactiveUsers.length === 0 ? (
                <tr>
                  <td colSpan="6">No inactive members.</td>
                </tr>
              ) : (
                inactiveUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.hostel_name || "-"}</td>
                    <td>{u.room_no || "-"}</td>
                    <td>{u.course || "-"}</td>
                    <td>{formatDate(u.date_of_joining)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
