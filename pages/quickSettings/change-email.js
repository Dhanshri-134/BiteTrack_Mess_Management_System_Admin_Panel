import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Sidebar from "../../components/Sidebar";
import styles from "../../styles/changeemail.module.css";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { API_BASE } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";


export default function ChangeEmail() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});


// Fetch all users
const fetchData = async () => {
  try {
    const token = getToken();
    if (!token) return console.warn("Token missing");

    const data = await offlineFetch("users-list", async () => {
      const res = await fetch(
        `${API_BASE}/api/users/list/`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    });
    
    setUsers(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("fetch users error:", err);
    setUsers([]);
  }
};
  useEffect(() => {
    fetchData();
  }, []);

  useAppRefresh(fetchData);
  
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.mobile?.includes(searchTerm)
  );

  const handleUpdateEmail = async () => {
    if (!selectedUser || !newEmail.trim()) return alert(t("selectUserAndEnterEmail"));

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/users/update-email/`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          id: selectedUser.id,
          email: newEmail,
          mail_sent: false,
          verified: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || t("updateFailed"));

      toast.success(t("emailUpdatedSuccessfully"));
      setSelectedUser(null);
      setNewEmail("");
      setSearchTerm("");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>

  <div className={styles.container}>
    <main className={styles.main}>
      <h1>{t("changeEmail")}</h1>

      <input
        type="text"
        placeholder={t("searchUserByNameEmailMobile")}
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
            {t("changingEmailFor")}: <strong>{selectedUser.name || `${selectedUser.first_name} ${selectedUser.last_name}`}</strong>
          </p>
          <input
            type="email"
            placeholder={t("enterNewEmail")}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            />
          <button onClick={handleUpdateEmail} disabled={loading}>
            {loading ? t("updating") : t("updateEmail")}
          </button>
        </div>
      )}
    </main>
  </div>
      </Layout>
  );
}
