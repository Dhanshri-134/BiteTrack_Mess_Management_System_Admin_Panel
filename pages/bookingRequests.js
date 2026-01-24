// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import styles from "../styles/bookingRequests.module.css";

// export default function BookingRequests() {
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchBookings();
//   }, []);

//   async function fetchBookings() {
//     try {
//       const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bookings/fetch");
//       const data = await res.json();
//       setBookings(data);
//     } catch (err) {
//       console.error("Error fetching bookings:", err);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function updateStatus(id, newStatus) {
//     try {
//       const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bookings/updateStatus", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id, status: newStatus }),
//       });

//       if (res.ok) {
//         fetchBookings();
//       }
//     } catch (err) {
//       console.error("Error updating status:", err);
//     }
//   }

//   if (loading) return <Layout><p className={styles.loading}>Loading...</p></Layout>;

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <h1 className={styles.title}>🎉 Function Booking Requests</h1>

//         <div className={styles.tableWrapper}>
//           <table className={styles.table}>
//             <thead>
//               <tr>
//                 <th>Name</th>
//                 <th>Mobile</th>
//                 <th>People</th>
//                 <th>Date</th>
//                 <th>Time</th>
//                 <th>Menu</th>
//                 <th>Address</th>
//                 <th>Status</th>
//                 <th>Estimated Cost</th>
//                 <th>Notes</th>
//                 <th>Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {bookings.map((b) => (
//                 <tr key={b.id}>
//                   <td>{b.name}</td>
//                   <td>{b.mobile_no}</td>
//                   <td>{b.people_count}</td>
//                   <td>{b.function_date}</td>
//                   <td>{b.function_time}</td>
//                   <td>{b.menu_preference}</td>
//                   <td>{b.address}</td>
//                   <td>
//                     <span
//                       className={`${styles.status} ${
//                         b.status === "approved"
//                           ? styles.approved
//                           : b.status === "rejected"
//                           ? styles.rejected
//                           : styles.pending
//                       }`}
//                     >
//                       {b.status || "Pending"}
//                     </span>
//                   </td>
//                   <td>₹{b.estimated_cost}</td>
//                   <td>{b.notes || "-"}</td>
//                   <td className={styles.actions}>
//                     <button
//                       onClick={() => updateStatus(b.id, "approved")}
//                       className={styles.approveBtn}
//                     >
//                       Approve
//                     </button>
//                     <button
//                       onClick={() => updateStatus(b.id, "rejected")}
//                       className={styles.rejectBtn}
//                     >
//                       Reject
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </Layout>
//   );
// }
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/bookingRequests.module.css";
import { offlineFetch } from "../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

export default function bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  
  const { t } = useLanguage();

  // Format date properly (YYYY-MM-DD)
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toISOString().split("T")[0];
  };

  // Fetch function bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
      console.warn("Session expired! Please login again.");
      return;
    }
      const data = await offlineFetch("bookings-list", async () => {
      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bookings/", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch bookings");
      return data;
      });
      setBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const updateStatus = async (id, status) => {
    if (!confirm(`Are you sure you want to mark this booking as ${status}?`))
      return;

    try {
      const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/bookings/${id}/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update booking");
      fetchBookings();
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const filtered = filter === "All"
    ? bookings
    : bookings.filter(b => b.status === filter);
    const sortedFiltered = [...filtered].sort((a, b) => a.id - b.id);


   return (
    <Layout>
      <div className={styles.container}>
        <h1>{t("functionBookings")}</h1>

        <div className={styles.controls}>
          <label>{t("filter")}:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>{t("all")}</option>
            <option>{t("pending")}</option>
            <option>{t("confirmed")}</option>
            <option>{t("rejected")}</option>
            <option>{t("completed")}</option>
          </select>
        </div>

        {loading ? (
          <p>{t("loadingBookings")}</p>
        ) : (
          <>
            {/* ===== DESKTOP TABLE ===== */}
            <div className={styles.desktopOnly}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("user")}</th>
                    <th>{t("mobile")}</th>
                    <th>{t("people")}</th>
                    <th>{t("menuPreference")}</th>
                    <th>{t("date")}</th>
                    <th>{t("status")}</th>
                    <th>{t("notes")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="9">{t("noBookingsFound")}</td></tr>
                  ) : (
                    sortedFiltered.map(b => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.name}</td>
                        <td>{b.mobile_no}</td>
                        <td>{b.people_count}</td>
                        <td>{b.menu_preference}</td>
                        <td>{formatDate(b.function_date)}</td>
                        <td>
                          <span className={`${styles.status} ${styles[b.status.toLowerCase()]}`}>
                            {t(b.status.toLowerCase())}
                          </span>
                        </td>
                        <td>{b.notes || "-"}</td>
                        <td className={styles.actions}>
                          {b.status === "Pending" && (
                            <>
                              <button onClick={() => updateStatus(b.id, "Confirmed")} className={styles.confirm}>
                                {t("confirm")}
                              </button>
                              <button onClick={() => updateStatus(b.id, "Rejected")} className={styles.reject}>
                                {t("reject")}
                              </button>
                            </>
                          )}
                          {b.status === "Confirmed" && (
                            <button onClick={() => updateStatus(b.id, "Completed")} className={styles.complete}>
                              {t("complete")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ===== MOBILE CARDS ===== */}
            <div className={styles.mobileOnly}>
              {filtered.length === 0 ? (
                <p>{t("noBookingsFound")}</p>
              ) : (
                sortedFiltered.map(b => (
                  <div key={b.id} className={styles.bookingCard}>
                    <div className={styles.cardHeader}>
                      <strong>#{b.id}</strong>
                      <span className={`${styles.status} ${styles[b.status.toLowerCase()]}`}>
                        {t(b.status.toLowerCase())}
                      </span>
                    </div>

                    <div className={styles.cardRow}><b>{t("user")}:</b> {b.name}</div>
                    <div className={styles.cardRow}><b>{t("mobile")}:</b> {b.mobile_no}</div>
                    <div className={styles.cardRow}><b>{t("people")}:</b> {b.people_count}</div>
                    <div className={styles.cardRow}><b>{t("menu")}:</b> {b.menu_preference}</div>
                    <div className={styles.cardRow}><b>{t("date")}:</b> {formatDate(b.function_date)}</div>
                    <div className={styles.cardRow}><b>{t("notes")}:</b> {b.notes || "-"}</div>

                    <div className={styles.actions}>
                      {b.status === "Pending" && (
                        <>
                          <button onClick={() => updateStatus(b.id, "Confirmed")} className={styles.confirm}>
                            {t("confirm")}
                          </button>
                          <button onClick={() => updateStatus(b.id, "Rejected")} className={styles.reject}>
                            {t("reject")}
                          </button>
                        </>
                      )}

                      {b.status === "Confirmed" && (
                        <button onClick={() => updateStatus(b.id, "Completed")} className={styles.complete}>
                          {t("complete")}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

      </div>
    </Layout>
  );
}
