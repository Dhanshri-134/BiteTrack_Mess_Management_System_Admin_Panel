import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import styles from "../styles/users.module.css";
import Link from "next/link";
import Layout from "../components/Layout";
import useAuth from "../hooks/useAuth";

export default function Users() {
  useAuth(); // Ensure user is authenticated
  const [verified, setVerified] = useState([]);
  const [unverified, setUnverified] = useState([]);
  const [unmailed, setUnmailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [modalUser, setModalUser] = useState(null);
  const [form, setForm] = useState({});
  const [activeTab, setActiveTab] = useState("verified"); // 👈 Default tab


  const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};


  const handleScan = async (qr) => {
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        headers: authHeaders(),
        body: JSON.stringify({ qr }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Attendance marked successfully");

        // fetch the names of recently marked users
        const ids = qr.split("-").map((p) => Number(p)).filter(Boolean);
        const namesRes = await fetch("/api/users/names", {
          method: "POST",
          // headers: { "Content-Type": "application/json" },
          headers: authHeaders(),
          body: JSON.stringify({ userIds: ids }),
        });
        const namesData = await namesRes.json();
        setRecentUsers(namesData.names || []);
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
  // Fetch users
  const fetchUsers = async () => {
    try {
    const [vRes, uRes, umRes] = await Promise.all([
      fetch("/api/users/verified", { headers: authHeaders() }),
      fetch("/api/users/unverified", { headers: authHeaders() }),
      fetch("/api/users/unmailed", { headers: authHeaders() }),
    ]);
      const [vData, uData, umData] = await Promise.all([
        vRes.json(),
        uRes.json(),
        umRes.json(),
      ]);
      setVerified(Array.isArray(vData) ? vData : []);
      setUnverified(Array.isArray(uData) ? uData : []);
      setUnmailed(Array.isArray(umData) ? umData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Send verification email
  const handleSendMail = async (user) => {
    try {
      await fetch("/api/users/sendmail", {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        headers: authHeaders(),
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      fetchUsers();
    } catch (err) {
      console.error("Error sending email:", err);
    }
  };

  // Open modal
  const openModal = (user) => {
    setModalUser(user);
    setForm({ ...user });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Update user
  const handleUpdate = async () => {
  try {
    // Update user details
    const res = await fetch("/api/update", {
      method: "PUT",
      // headers: { "Content-Type": "application/json" },
      headers: authHeaders(),
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to update user");
      return;
    }

    // Update parent details
    const parentData = {
      user_id: modalUser.id,
      name: form.parent_name,
      contact: form.parent_contact,
      address: form.parent_address,
    };

    await fetch("/api/parents/update", {
      method: "PUT",
      // headers: { "Content-Type": "application/json" },
      headers: authHeaders(),
      body: JSON.stringify(parentData),
    });

    fetchUsers();
    setModalUser(null);
  } catch (err) {
    console.error(err);
  }
};

  // Search + Sort
  const filterAndSort = (users) => {
    let filtered = users;
    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.phone?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  };

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const tableColumns = [
    { key: "name", label: "Name" },
    { key: "first_name", label: "First Name" },
    { key: "last_name", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "room_no", label: "Room No" },
    { key: "hostel_name", label: "Hostel" },
    { key: "course", label: "Course" },
    { key: "date_of_joining", label: "Date of Joining" },
    { key: "first_attendance_date", label: "first attendance date" },
    {
      key: "parents",
      label: "Parents",
      render: (u) =>
        u.parents && u.parents.length > 0 ? (
          u.parents.map((p, i) => (
            <div key={i} style={{ marginBottom: "0.5rem" }}>
              <strong>{p.name}</strong> ({p.contact})
              <br />
              {p.address}
            </div>
          ))
        ) : (
          <span style={{ color: "#6b7280" }}>No parents</span>
        ),
    },
  ];

  const renderTable = (users, columns, actions = null) => (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => requestSort(col.key)}
                style={{ cursor: "pointer" }}
              >
                {col.label} {renderSortArrow(col.key)}
              </th>
            ))}
            {actions && <th>{actions.label}</th>}
          </tr>
        </thead>
        <tbody>
          {filterAndSort(users).map((u) => (
            <tr key={u.id}>
              {columns.map((col) => (
                // <td key={col.key} data-label={col.label}>
                //   {col.render ? col.render(u) : u[col.key]}
                // </td>
                <td key={col.key} data-label={col.label}>
  {(() => {
    const value = u[col.key];
    if (!value) return ""; // handle nulls

    // Detect if this is a date field and format
    if (col.key === "date_of_joining" || col.key === "created_at" || col.key === "first_attendance_date") {
      const date = new Date(value);
      // Format to local date (India time)
      return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    }

    

    return col.render ? col.render(u) : value;
  })()}
</td>

              ))}
              {actions && <td>{actions.render(u)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

const deleteUser = async (user) => {
  const confirmDelete = confirm(`Are you sure you want to delete ${user.name}?`);
  if (!confirmDelete) return;

  const res = await fetch("/api/users/delete", {
    method: "DELETE", // ✅ use DELETE
    // headers: { "Content-Type": "application/json" },
    headers: authHeaders(),
    body: JSON.stringify({ id: user.id }), // ✅ use id
  });

  const data = await res.json();

  if (res.ok) {
    alert("User deleted successfully");
    fetchUsers(); // Refresh user list
  } else {
    alert(data.error || "Failed to delete user");
  }
};


const changeDOJ = async (user) => {
  
  const date_of_joining = prompt("Enter new Date of Joining (YYYY-MM-DD):", user.first_attendance_date);
  if (!date_of_joining) return;

  const res = await fetch("/api/users/changeDOJ", {
    method: "PUT",
    // headers: { "Content-Type": "application/json" },
    headers: authHeaders(),
    body: JSON.stringify({ id: user.id, date_of_joining }),
  });

  const data = await res.json();
  
  if (res.ok) {
    alert("User updated successfully");
    fetchUsers();
  } else {
    alert(data.error || "Failed to delete user");
  }
  console.log(data);
};


    


  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1>Users</h1>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
          />

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "verified" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("verified")}
            >
              Verified Users ({verified.length})
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "unverified" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("unverified")}
            >
              Pending Verification ({unverified.length})
            </button>
            <button
              className={`${styles.tabBtn} ${
                activeTab === "unmailed" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("unmailed")}
            >
              Send Mail ({unmailed.length})
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <>
              {activeTab === "verified" &&
                (verified.length === 0 ? (
                  <div className={styles.empty}>No verified users</div>
                ) : (
                  renderTable(verified, tableColumns, {
                    label: "Update",
                    render: (u) => (
                      <div>

                      <button
                        className={styles.button}
                        onClick={() => openModal(u)}
                        >
                        Update
                      </button>

                      <button
                        className={styles.button}
                        onClick={() => deleteUser(u)}
                        >
                        Delete
                      </button>
                      <button
                        className={styles.button}
                        onClick={() => changeDOJ(u)}
                        >
                        Change DOJ
                      </button>
                        </div>
                    ),
                    
                  })
                ))}

              {activeTab === "unverified" &&
                (unverified.length === 0 ? (
                  <div className={styles.empty}>No unverified users</div>
                ) : (
                  renderTable(unverified, tableColumns, {
                    label: "Verify",
                    render: (u) => (
                      <Link
                        href={`/verify?email=${encodeURIComponent(u.email)}`}
                      >
                        <button className={styles.button}>Verify</button>
                      </Link>
                    ),
                  })
                ))}

              {activeTab === "unmailed" &&
                (unmailed.length === 0 ? (
                  <div className={styles.empty}>No users to send mail</div>
                ) : (
                  renderTable(
                    unmailed,
                   tableColumns,
                    {
                      label: "Send Mail",
                      render: (u) => (
                        <button
                          className={styles.button}
                          onClick={() => handleSendMail(u)}
                        >
                          Send Email
                        </button>
                      ),
                    }
                  )
                ))}
            </>
          )}

          {/* Update Modal */}
{/* Update Modal */}
{modalUser && (
  <div className={styles.modalOverlay}>
    <div className={styles.modal}>
      <h2>Update User</h2>
      <div
        style={{
          maxHeight: "70vh", // limit modal height
          overflowY: "auto", // enable vertical scroll
          paddingRight: "0.5rem", // optional for scrollbar spacing
        }}
      >
        <label>
          First Name:
          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
          />
        </label>
        <label>
          Last Name:
          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
          />
        </label>
        <label>
          Phone:
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
          />
        </label>
        <label>
          Mobile:
          <input
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
          />
        </label>
        <label>
          Room No:
          <input
            name="room_no"
            value={form.room_no}
            onChange={handleChange}
          />
        </label>
        <label>
          Hostel:
          <input
            name="hostel_name"
            value={form.hostel_name}
            onChange={handleChange}
          />
        </label>
        <label>
          Course:
          <input
            name="course"
            value={form.course}
            onChange={handleChange}
          />
        </label>

        {/* Parent Details */}
        <h3 style={{ marginTop: "1rem", color: "#3b82f6" }}>Parent Details</h3>
        <label>
          Parent Name:
          <input
            name="parent_name"
            value={form.parent_name || ""}
            onChange={handleChange}
          />
        </label>
        <label>
          Parent Contact:
          <input
            name="parent_contact"
            value={form.parent_contact || ""}
            onChange={handleChange}
          />
        </label>
        <label>
          Parent Address:
          <input
            name="parent_address"
            value={form.parent_address || ""}
            onChange={handleChange}
          />
        </label>
      </div>

      <div className={styles.modalActions} style={{ marginTop: "1rem" }}>
        <button onClick={handleUpdate} className={styles.button}>
          Save
        </button>
        <button
          onClick={() => setModalUser(null)}
          className={styles.buttonCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}


        </main>
      </div>
    </Layout>
  );
}
