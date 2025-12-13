import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import styles from "../styles/changeemail.module.css";

export default function ChangeEmail() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users/list");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.mobile?.includes(searchTerm)
  );

  const handleUpdateEmail = async () => {
    if (!selectedUser || !newEmail.trim()) return alert("Select a user and enter new email");

    try {
      setLoading(true);
      const res = await fetch("/api/users/update-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          email: newEmail,
          mail_sent: false,
          verified: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || "Failed to update email");

      alert("Email updated successfully!");
      setSelectedUser(null);
      setNewEmail("");
      setSearchTerm("");
    } catch (err) {
      console.error(err);
      alert("Error updating email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
  <div className={styles.container}>
    <Sidebar />
    <main className={styles.main}>
      <h1>Change User Email</h1>

      <input
        type="text"
        placeholder="Search user by name, email, or mobile"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />

      {searchTerm && filteredUsers.length > 0 && (
        <ul className={styles.userList}>
          {filteredUsers.map((u) => (
            <li
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={selectedUser?.id === u.id ? styles.selectedUser : ""}
            >
              {u.name || `${u.first_name} ${u.last_name}`} ({u.email})
            </li>
          ))}
        </ul>
      )}

      {selectedUser && (
        <div className={styles.changeEmailForm}>
          <p>
            Changing email for: <strong>{selectedUser.name || `${selectedUser.first_name} ${selectedUser.last_name}`}</strong>
          </p>
          <input
            type="email"
            placeholder="Enter new email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button onClick={handleUpdateEmail} disabled={loading}>
            {loading ? "Updating..." : "Update Email"}
          </button>
        </div>
      )}
    </main>
  </div>
</Layout>
  );
}
