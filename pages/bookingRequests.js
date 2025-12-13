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
//       const res = await fetch("/api/bookings/fetch");
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
//       const res = await fetch("/api/bookings/updateStatus", {
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

export default function bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  // Format date properly (YYYY-MM-DD)
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toISOString().split("T")[0];
  };

  // Fetch function bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch bookings");
      setBookings(data);
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
      const res = await fetch(`/api/bookings/${id}`, {
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
      alert("Error updating booking: " + err.message);
    }
  };

  const filtered = filter === "All"
    ? bookings
    : bookings.filter(b => b.status === filter);

  return (
    <Layout>
      <div className={styles.container}>
        <h1>🎉 Function Bookings</h1>

        <div className={styles.controls}>
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            <option>Pending</option>
            <option>Confirmed</option>
            <option>Rejected</option>
            <option>Completed</option>
          </select>
        </div>

        {loading ? (
          <p>Loading bookings...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Mobile</th>
                <th>People</th>
                <th>Menu Pref.</th>
                <th>Date</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="9">No bookings found.</td></tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{b.name}</td>
                    <td>{b.mobile_no}</td>
                    <td>{b.people_count}</td>
                    <td>{b.menu_preference}</td>
                    <td>{formatDate(b.function_date)}</td>
                    <td>
                      <span className={`${styles.status} ${styles[b.status.toLowerCase()]}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>{b.notes || "-"}</td>
                    <td className={styles.actions}>
                      {b.status === "Pending" && (
                        <>
                          <button 
                            onClick={() => updateStatus(b.id, "Confirmed")} 
                            className={styles.confirm}
                          >
                            Confirm
                          </button>
                          <button 
                            onClick={() => updateStatus(b.id, "Rejected")} 
                            className={styles.reject}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {b.status === "Confirmed" && (
                        <button 
                          onClick={() => updateStatus(b.id, "Completed")} 
                          className={styles.complete}
                        >
                          Complete
                        </button>
                      )}
                    </td>
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
