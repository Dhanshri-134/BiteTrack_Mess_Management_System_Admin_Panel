// pages/notifications.js
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/notification.module.css";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

function decodeToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

const tokenHeader = () => {
  const t = getToken();
  if (!t) throw new Error("Token missing");
  return { Authorization: `Bearer ${t}` };
};

export default function Notifications() {
  const { t } = useLanguage();

  // 🔥 NEW: tab switching
  const [activeTab, setActiveTab] = useState("push");
  const [role, setRole] = useState(null);

  // push notifications
  const [pushList, setPushList] = useState([]);
  const [pushGroups, setPushGroups] = useState([]);

  // superadmin notifications
  const [superList, setSuperList] = useState([]);

  const [form, setForm] = useState({
    title: "",
    message: "",
    notification_type: "general",
    priority: "normal",
  });

  const tokenHeader = () => {
    const t = localStorage.getItem("token");
    return { Authorization: `Bearer ${t}` };
  };

  // ---- Load push notifications ----
  const loadPush = async () => {
    try {
      const data = await offlineFetch("push-notifications", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/notifications/",
          { headers: tokenHeader() }
        );

        if (!res.ok) throw new Error(t("failedToLoadPush"));
        return res.json();
      });

      const list = Array.isArray(data) ? data : [];
      setPushList(list);
      setPushGroups(groupPush(list));
    } catch (err) {
      console.error("loadPush error:", err);
      setPushList([]);
      setPushGroups([]);
    }
  };

  // ---- Group logic (unchanged) ----
  const groupPush = (items) => {
    const map = {};
    items.forEach((n) => {
      const created = new Date(n.created_at);
      const minuteKey = created.toISOString().slice(0, 16);
      const key = `${n.title}__${n.message}__${minuteKey}`;

      if (!map[key]) {
        map[key] = {
          title: n.title,
          message: n.message,
          notification_type: n.notification_type,
          priority: n.priority,
          created_at: minuteKey,
          count: 0,
          ids: [],
        };
      }

      map[key].count++;
      map[key].ids.push(n.id);
    });

    return Object.values(map).sort((a, b) =>
      b.created_at > a.created_at ? 1 : -1
    );
  };

  // ---- Load superadmin notifications ----
  const loadSuper = async () => {
    try {
      const data = await offlineFetch("super-notifications", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/superadmin-notifications/",
          { headers: tokenHeader() }
        );

        if (!res.ok) throw new Error(t("failedToLoadSuper"));
        return res.json();
      });

      setSuperList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadSuper error:", err);
      setSuperList([]);
    }
  };

  const loadAll = async () => {
    try {
      await loadPush();
      if (role !== "STAFF") {
        await loadSuper();
      }
    } catch (err) {
      console.error("loadAll error:", err);
    }
  };

  useEffect(() => {
    if (role) loadAll();
  }, [role]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decoded = decodeToken(token);
    if (decoded?.role) {
      setRole(decoded.role); // STAFF | MESS_ADMIN
    }
  }, []);

  // ---- Send push ----
  const createPush = async () => {
    if (!form.title || !form.message)
      return toast(t("titleMessageRequired"));

    const res = await fetch(
      "https://bite-track-mess-management-system-a.vercel.app/api/notifications/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify(form),
      }
    );

    await res.json();
    setForm({
      title: "",
      message: "",
      notification_type: "general",
      priority: "normal",
    });
    loadPush();
  };

  // ---- Delete grouped ----
  const deletePushGroup = async (ids) => {
    if (!confirm(t("deleteGroupConfirm", { count: ids.length }))) return;

    try {
      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/notifications/delete-groups/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tokenHeader() },
          body: JSON.stringify({ ids }),
        }
      );

      if (!res.ok) {
        for (const id of ids) {
          await fetch(
            `https://bite-track-mess-management-system-a.vercel.app/api/notifications?id=${id}/`,
            {
              method: "DELETE",
              headers: { ...tokenHeader() },
            }
          );
        }
      }

      loadPush();
    } catch (err) {
      console.error(err);
      toast.error(t("somethingWentWrong"));
    }
  };

  // ---- Seen superadmin ----
  const seenSuper = async (id) => {
    if (!confirm(t("markSeenConfirm"))) return;

    const res = await fetch(
      `https://bite-track-mess-management-system-a.vercel.app/api/superadmin-notifications?id=${id}/`,
      {
        method: "DELETE",
        headers: tokenHeader(),
      }
    );

    if (!res.ok) return toast.error(t("somethingWentWrong"));

    loadSuper();
  };

  return (
    <Layout>
      <div className={styles.container}>
        {/* 🔥 TAB HEADER */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "push" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("push")}
          >
            {t("pushNotifications")}
          </button>

          {role !== "STAFF" && (
            <button
              className={`${styles.tabBtn} ${
                activeTab === "super" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("super")}
            >
              {t("superadminNotifications")}
            </button>
          )}
        </div>

        {/* ---------------- TAB CONTENT ---------------- */}

        {activeTab === "push" && (
          <section className={styles.card}>
            <h2 className={styles.header}>{t("pushNotifications")}</h2>

            <div className={styles.inputGroup}>
              <label className={styles.label}>{t("title")}</label>
              <input
                className={styles.input}
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>{t("message")}</label>
              <textarea
                className={styles.textarea}
                value={form.message}
                onChange={(e) =>
                  setForm({ ...form, message: e.target.value })
                }
              />
            </div>

            <div className={styles.formRow}>
              <select
                className={styles.select}
                value={form.notification_type}
                onChange={(e) =>
                  setForm({ ...form, notification_type: e.target.value })
                }
              >
                <option value="general">{t("general")}</option>
                <option value="announcement">{t("announcement")}</option>
                <option value="event">{t("event")}</option>
                <option value="poll">{t("poll")}</option>
              </select>

              <select
                className={styles.select}
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
              >
                <option value="normal">{t("normal")}</option>
                <option value="high">{t("high")}</option>
                <option value="urgent">{t("urgent")}</option>
              </select>

              <button className={styles.button} onClick={createPush}>
                {t("send")}
              </button>
            </div>

            <h3 className={styles.header2}>
              {t("groupedDuplicates")}
            </h3>

            <table className={styles.list}>
              <thead>
                <tr>
                  <th>{t("count")}</th>
                  <th>{t("title")}</th>
                  <th>{t("message")}</th>
                  <th>{t("time")}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {pushGroups.length > 0 ? (
                  pushGroups.map((g, i) => (
                    <tr key={i}>
                      <td>{g.count}</td>
                      <td>{g.title}</td>
                      <td>{g.message}</td>
                      <td>{new Date(g.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          className={styles.actionBtn}
                          onClick={() => deletePushGroup(g.ids)}
                        >
                          {t("deleteGroup")}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 18 }}>
                      {t("noPushNotifications")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === "super" && (
          <section className={styles.card}>
            <h2 className={styles.header}>
              {t("notificationsFromShrisTech")}
            </h2>

            <table className={styles.list}>
              <thead>
                <tr>
                  <th>{t("title")}</th>
                  <th>{t("message")}</th>
                  <th>{t("time")}</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {superList.length > 0 ? (
                  superList.map((s) => (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      <td>{s.message}</td>
                      <td>{new Date(s.created_at).toLocaleString()}</td>
                      <td>
                        <button
                          className={styles.actionBtn}
                          onClick={() => seenSuper(s.id)}
                        >
                          {t("seen")}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", padding: 18 }}>
                      {t("noCompanyNotifications")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </Layout>
  );
}
