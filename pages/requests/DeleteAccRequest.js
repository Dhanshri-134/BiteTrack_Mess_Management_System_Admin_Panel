import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/deleteRequests.module.css";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { confirmToast } from "../../lib/confirmToast";


export default function DeleteRequests() {
  const [requests, setRequests] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("requests");
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });
  
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
      const token = getToken();
      if (!token) return console.warn(t("tokenMissing"));
      
      const data = await offlineFetch("delete-requests-all", async () => {
        // fetch delete requests
        const reqRes = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/accountDeletion/list/",
          { headers: authHeaders() }
        );
        if (!reqRes.ok) throw new Error(t("failedToFetchDeleteRequests"));
        const reqData = await reqRes.json();

        // fetch inactive users
        const inactiveRes = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/inactive/",
          { headers: authHeaders() }
        );
        if (!inactiveRes.ok) throw new Error(t("failedToFetchInactiveUsers"));
        const inactiveData = await inactiveRes.json();

        return {
          requests: reqData,
          inactive: inactiveData.data || [],
        };
      });

      setRequests(
        Array.isArray(data.requests)
          ? data.requests.filter((r) => r.status === "pending")
          : []
        );

        setInactiveUsers(Array.isArray(data.inactive) ? data.inactive : []);
      } catch (err) {
      console.error(t("fetchAllError"), err);
      setRequests([]);
      setInactiveUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);
  useAppRefresh(fetchAll);

  const deleteUser = async (user) => {
    const confirmDelete = await confirmToast(`${t("confirmDeleteUser")} ${user.name}?`);
    if (!confirmDelete) return;

  const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/delete/", {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify({ id: user.id }),
  });
  
  const data = await res.json();

  if (res.ok) {
    toast.success(t("userDeletedSuccess"));
    fetchAll();
  } else {
    toast.error(t("somethingWentWrong"));
  }
};

  // Update request status (Approve / Reject)
  const updateStatus = async (id, status) => {
    const confirmed = await confirmToast(t("confirmMarkRequest", { status }));
    if (!confirmed) return;

    try {
      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/accountDeletion/update/`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ id, status }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchAll();
    } catch (err) {
      toast.error(t("somethingWentWrong"));
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1>{t("deleteAccountRequests")}</h1>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "requests" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("requests")}
          >
            {t("requests")}
          </button>

          <button
            className={`${styles.tab} ${
              activeTab === "inactive" ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab("inactive")}
          >
            {t("inactiveMembers")}
          </button>
        </div>

        {loading ? (
          <p>{t("loading")}</p>
        ) : activeTab === "requests" ? (
          /* 🔵 DELETE REQUESTS */
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("id")}</th>
                <th>{t("user")}</th>
                <th>{t("email")}</th>
                <th>{t("reason")}</th>
                <th>{t("requestedAt")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6">{t("noPendingRequests")}</td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td data-label={t("id")}>{r.id}</td>
                    <td data-label={t("user")}>{r.user_name}</td>
                    <td data-label={t("email")}>{r.user_email}</td>
                    <td data-label={t("reason")}>{r.reason || "-"}</td>
                    <td data-label={t("requestedAt")}>
                      {formatDate(r.requested_at)}
                    </td>
                    <td data-label={t("actions")} className={styles.actions}>
                      <button
                        className={styles.approve}
                        onClick={() => updateStatus(r.id, "approved")}
                      >
                        {t("approve")}
                      </button>

                      <button
                        className={styles.reject}
                        onClick={() => updateStatus(r.id, "rejected")}
                      >
                        {t("reject")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* 🔴 INACTIVE MEMBERS */
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("user")}</th>
                <th>{t("email")}</th>
                <th>{t("hostel")}</th>
                <th>{t("room")}</th>
                <th>{t("course")}</th>
                <th>{t("dateOfJoining")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>
              {inactiveUsers.length === 0 ? (
                <tr>
                  <td colSpan="6">{t("noInactiveMembers")}</td>
                </tr>
              ) : (
                inactiveUsers.map((u) => (
                  <tr key={u.id}>
                    <td data-label={t("user")}>{u.name}</td>
                    <td data-label={t("email")}>{u.email}</td>
                    <td data-label={t("hostel")}>{u.hostel_name || "-"}</td>
                    <td data-label={t("room")}>{u.room_no || "-"}</td>
                    <td data-label={t("course")}>{u.course || "-"}</td>
                    <td data-label={t("dateOfJoining")}>
                      {formatDate(u.date_of_joining)}
                    </td>
                    <button className={styles.button} onClick={() => deleteUser(u)}>
                          {t("delete")}
                        </button>
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
