// pages/notifications.js
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import styles from "../styles/notification.module.css";

export default function Notifications() {
  // 🔥 NEW: tab switching
  const [activeTab, setActiveTab] = useState("push");

  // push notifications (mess-level) — grouped
  const [pushList, setPushList] = useState([]);
  const [pushGroups, setPushGroups] = useState([]);

  // superadmin notifications (company-level)
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
    const res = await fetch("/api/notifications", { headers: { ...tokenHeader() } });
    const data = await res.json();

    setPushList(Array.isArray(data) ? data : []);
    setPushGroups(groupPush(Array.isArray(data) ? data : []));
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

    return Object.values(map).sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  };

  // ---- Load superadmin notifications ----
  const loadSuper = async () => {
    const res = await fetch("/api/superadmin-notifications", {
      headers: tokenHeader(),
    });

    const data = await res.json();
    setSuperList(Array.isArray(data) ? data : []);
  };

  const loadAll = async () => {
    await Promise.all([loadPush(), loadSuper()]);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ---- Send push ----
  const createPush = async () => {
    if (!form.title || !form.message) return alert("Title and message required");

    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenHeader() },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    alert(data.message || "Sent");
    setForm({ title: "", message: "", notification_type: "general", priority: "normal" });
    loadPush();
  };

  // ---- Delete grouped ----
  const deletePushGroup = async (ids) => {
    if (!confirm(`Delete ${ids.length} notifications in this group?`)) return;

    try {
      const res = await fetch("/api/notifications/delete-group", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        for (const id of ids) {
          await fetch(`/api/notifications?id=${id}`, {
            method: "DELETE",
            headers: { ...tokenHeader() },
          });
        }
      }

      loadPush();
    } catch (err) {
      console.error(err);
      alert("Failed to delete group");
    }
  };

  // ---- Seen superadmin ----
  const seenSuper = async (id) => {
    if (!confirm("Mark as seen? This will delete the notification.")) return;

    const res = await fetch(`/api/superadmin-notifications?id=${id}`, {
      method: "DELETE",
      headers: tokenHeader(),
    });

    const data = await res.json();

    if (!res.ok) return alert(data.message || "Failed");

    loadSuper();
  };

  return (
    <Layout>
      <div className={styles.container}>
        
        {/* 🔥 TAB HEADER */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === "push" ? styles.active : ""}`}
            onClick={() => setActiveTab("push")}
          >
            Push Notifications
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "super" ? styles.active : ""}`}
            onClick={() => setActiveTab("super")}
          >
            Superadmin Notifications
          </button>
        </div>

        {/* ---------------- TAB CONTENT ---------------- */}

        {activeTab === "push" && (
          <>
            {/* Push Notifications section */}
            <section className={styles.card} style={{ marginBottom: 24 }}>
              <h2 className={styles.header}>Push Notifications</h2>

              {/* Create form */}
              <div style={{ marginBottom: 12 }}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Title</label>
                  <input
                    className={styles.input}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Message</label>
                  <textarea
                    className={styles.textarea}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <select
                    className={styles.select}
                    value={form.notification_type}
                    onChange={(e) => setForm({ ...form, notification_type: e.target.value })}
                  >
                    <option value="general">General</option>
                    <option value="announcement">Announcement</option>
                    <option value="event">Event</option>
                    <option value="poll">Poll</option>
                  </select>

                  <select
                    className={styles.select}
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  <button className={styles.button} onClick={createPush}>Send</button>
                </div>
              </div>

              {/* Group table */}
              <div>
                <h3 style={{ marginBottom: 8 }}>Grouped (duplicates collapsed)</h3>
                <table className={styles.list}>
                  <thead>
                    <tr>
                      <th>Count</th>
                      <th>Title</th>
                      <th>Message</th>
                      <th>Time</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pushGroups.length > 0 ? (
                      pushGroups.map((g, i) => (
                        <tr key={i}>
                          <td>{g.count}</td>
                          <td>{g.title}</td>
                          <td style={{ maxWidth: 420 }}>{g.message}</td>
                          <td>{new Date(g.created_at).toLocaleString()}</td>
                          <td>
                            <button className={styles.actionBtn} onClick={() => deletePushGroup(g.ids)}>
                              Delete Group
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" style={{ textAlign: "center", padding: 18 }}>No push notifications</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === "super" && (
          <>
            {/* Superadmin Notifications */}
            <section className={styles.card}>
              <h2 className={styles.header}>Notifications From Shris Tech</h2>

              <table className={styles.list}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Message</th>
                    <th>Time</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {superList.length > 0 ? (
                    superList.map((s) => (
                      <tr key={s.id}>
                        <td style={{ width: 240 }}>{s.title}</td>
                        <td style={{ maxWidth: 560 }}>{s.message}</td>
                        <td>{new Date(s.created_at).toLocaleString()}</td>
                        <td>
                          <button className={styles.actionBtn} onClick={() => seenSuper(s.id)}>
                            Seen
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: 18 }}>
                        No company notifications
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}



// // pages/notifications.js
// import { useState, useEffect } from "react";
// import Layout from "../components/Layout";
// import styles from "../styles/notification.module.css";

// export default function Notifications() {
//   // push notifications (mess-level) — grouped
//   const [pushList, setPushList] = useState([]);
//   const [pushGroups, setPushGroups] = useState([]);

//   // superadmin notifications (company-level)
//   const [superList, setSuperList] = useState([]);

//   const [form, setForm] = useState({
//     title: "",
//     message: "",
//     notification_type: "general",
//     priority: "normal",
//   });

//   const tokenHeader = () => {
//   const t = localStorage.getItem("token");
//   return { Authorization: `Bearer ${t}` };
// };


//   // ---- Load push notifications (your notifications table) ----
//   const loadPush = async () => {
//     const res = await fetch("/api/notifications", { headers: { ...tokenHeader() } });
//     const data = await res.json();
//     // data is expected array of notifications
//     setPushList(Array.isArray(data) ? data : []);
//     setPushGroups(groupPush(Array.isArray(data) ? data : []));
//   };

//   // Grouping: same title + same message + same exact minute timestamp
//   const groupPush = (items) => {
//     const map = {};
//     items.forEach((n) => {
//       // create minute-precision key (YYYY-MM-DDTHH:MM)
//       const created = new Date(n.created_at);
//       const minuteKey = created.toISOString().slice(0, 16); // up to minutes
//       const key = `${n.title}__${n.message}__${minuteKey}`;

//       if (!map[key]) {
//         map[key] = {
//           title: n.title,
//           message: n.message,
//           notification_type: n.notification_type,
//           priority: n.priority,
//           created_at: minuteKey,
//           count: 0,
//           ids: [],
//         };
//       }
//       map[key].count += 1;
//       map[key].ids.push(n.id);
//     });

//     // sort newest first
//     return Object.values(map).sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
//   };

//   // ---- Load superadmin notifications ----
//   const loadSuper = async () => {
//   const res = await fetch("/api/superadmin-notifications", {
//     headers: tokenHeader(),
//   });

//   const data = await res.json();
//   setSuperList(Array.isArray(data) ? data : []);
// };



//   // combined loader
//   const loadAll = async () => {
//   await Promise.all([loadPush(), loadSuper()]);
// };


//   useEffect(() => {
//     loadAll();
//   }, []);

//   // ---- Create push notification (POST /api/notifications) ----
//   const createPush = async () => {
//     if (!form.title || !form.message) return alert("Title and message required");

//     const res = await fetch("/api/notifications", {
//       method: "POST",
//       headers: { "Content-Type": "application/json", ...tokenHeader() },
//       body: JSON.stringify(form),
//     });

//     const data = await res.json();
//     alert(data.message || "Sent");
//     setForm({ title: "", message: "", notification_type: "general", priority: "normal" });
//     loadPush();
//   };

//   // ---- Delete group of push notifications ----
//   const deletePushGroup = async (ids) => {
//     if (!confirm(`Delete ${ids.length} notifications in this group?`)) return;
//     // prefer batch endpoint if exists
//     try {
//       const res = await fetch("/api/notifications/delete-group", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", ...tokenHeader() },
//         body: JSON.stringify({ ids }),
//       });

//       if (!res.ok) {
//         // fallback: delete each individually
//         for (const id of ids) {
//           await fetch(`/api/notifications?id=${id}`, { method: "DELETE", headers: { ...tokenHeader() } });
//         }
//       }

//       loadPush();
//     } catch (err) {
//       console.error(err);
//       alert("Failed to delete group");
//     }
//   };

//   // ---- Mark superadmin notification as seen (DELETE) ----
//   const seenSuper = async (id) => {
//   if (!confirm("Mark as seen? This will delete the notification.")) return;

//   const res = await fetch(`/api/superadmin-notifications?id=${id}`, {
//     method: "DELETE",
//     headers: tokenHeader(),
//   });

//   const data = await res.json();

//   if (!res.ok) {
//     alert(data.message || "Failed");
//     return;
//   }

//   loadSuper();
// };


//   return (
//     <Layout>
//       <div className={styles.container}>

//         {/* Push Notifications section */}
//         <section className={styles.card} style={{ marginBottom: 24 }}>
//           <h2 className={styles.header}>Push Notifications</h2>

//           {/* Create form */}
//           <div style={{ marginBottom: 12 }}>
//             <div className={styles.inputGroup}>
//               <label className={styles.label}>Title</label>
//               <input className={styles.input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
//             </div>

//             <div className={styles.inputGroup}>
//               <label className={styles.label}>Message</label>
//               <textarea className={styles.textarea} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
//             </div>

//             <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
//               <select className={styles.select} value={form.notification_type} onChange={(e) => setForm({ ...form, notification_type: e.target.value })}>
//                 <option value="general">General</option>
//                 <option value="announcement">Announcement</option>
//                 <option value="event">Event</option>
//                 <option value="poll">Poll</option>
//               </select>

//               <select className={styles.select} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
//                 <option value="normal">Normal</option>
//                 <option value="high">High</option>
//                 <option value="urgent">Urgent</option>
//               </select>

//               <button className={styles.button} onClick={createPush}>Send</button>
//             </div>
//           </div>

//           {/* Grouped push notifications table */}
//           <div>
//             <h3 style={{ marginBottom: 8 }}>Grouped (duplicates collapsed)</h3>
//             <table className={styles.list}>
//               <thead>
//                 <tr>
//                   <th>Count</th>
//                   <th>Title</th>
//                   <th>Message</th>
//                   <th>Time</th>
//                   <th></th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {pushGroups.length > 0 ? pushGroups.map((g, i) => (
//                   <tr key={i}>
//                     <td>{g.count}</td>
//                     <td>{g.title}</td>
//                     <td style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.message}</td>
//                     <td>{new Date(g.created_at).toLocaleString()}</td>
//                     <td>
//                       <button className={styles.actionBtn} onClick={() => deletePushGroup(g.ids)}>Delete Group</button>
//                     </td>
//                   </tr>
//                 )) : (
//                   <tr><td colSpan="5" style={{ textAlign: "center", padding: 18 }}>No push notifications</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </section>

//         {/* SuperAdmin Notifications section */}
//         <section className={styles.card}>
//   <h2 className={styles.header}>Notifications (From Company / SuperAdmin)</h2>

//   <table className={styles.list}>
//     <thead>
//       <tr>
//         <th>Title</th>
//         <th>Message</th>
//         <th>Time</th>
//         <th></th>
//       </tr>
//     </thead>

//     <tbody>
//       {superList.length > 0 ? (
//         superList.map((s) => (
//           <tr key={s.id}>
//             <td style={{ width: 240 }}>{s.title}</td>
//             <td style={{ maxWidth: 560 }}>{s.message}</td>
//             <td>{new Date(s.created_at).toLocaleString()}</td>
//             <td>
//               <button className={styles.actionBtn} onClick={() => seenSuper(s.id)}>
//                 Seen
//               </button>
//             </td>
//           </tr>
//         ))
//       ) : (
//         <tr>
//           <td colSpan="4" style={{ textAlign: "center", padding: 18 }}>
//             No company notifications
//           </td>
//         </tr>
//       )}
//     </tbody>
//   </table>
// </section>

//       </div>
//     </Layout>
//   );
// }
