// import { useEffect, useState } from "react";
// import Layout from "../../components/Layout";
// import styles from "../../styles/fasting.module.css";
// import useAuth from "../../hooks/useAuth";

// export default function FastingRequests() {
//   const { user } = useAuth(); // logged-in admin
//   const messId = user?.mess_id;

//   const [users, setUsers] = useState([]);
//   const [totalRequests, setTotalRequests] = useState(0);

//   const fetchData = async () => {
//     if (!messId) return;

//     const res = await fetch(`/api/menu/fasting/fetch?mess_id=${messId}`);
//     const data = await res.json();
//     setUsers(data.users || []);
//     setTotalRequests(data.totalRequests || 0);
//   };

//   useEffect(() => {
//     if (messId) fetchData();
//   }, [messId]);

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <h2 className="font-bold text-lg mb-4">Fasting Requests Summary</h2>

//         <div className={styles.summarySection}>
//           <div className={`${styles.card} ${styles.approved}`}>
//             Total Fasting Requests: <b>{totalRequests}</b>
//           </div>
//         </div>

//         <table className={styles.table}>
//           <thead>
//             <tr>
//               <th>Username</th>
//               <th>Email</th>
//               <th>Requested Days</th>
//             </tr>
//           </thead>
//           <tbody>
//             {users.length > 0 ? (
//               users.map((user) => (
//                 <tr key={user.user_id}>
//                   <td>{user.username || "Unknown"}</td>
//                   <td>{user.email || "N/A"}</td>
//                   <td>{user.total_requests}</td>
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td colSpan="3">No fasting requests found.</td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </Layout>
//   );
// }
import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/fasting.module.css";
import useAuth from "../../hooks/useAuth";

export default function FastingRequests() {
  useAuth(); 
  const [fastingRequests, setFastingRequests] = useState([]);
  const [totalRequests, setTotalRequests] = useState(0);

  const token = localStorage.getItem("token");

  const fetchData = async () => {
    if (!token) return;

    try {
      const res = await fetch(`/api/menu/fasting/fetch`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch fasting requests");

      const data = await res.json();

      // fastingRequests contains [{ name, phone, fasting_date }, ...]
      setFastingRequests(data.fastingRequests || []);
      setTotalRequests(data.totalRequests || 0);

    } catch (err) {
      console.error("Error fetching fasting requests:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  return (
    <Layout>
      <div className={styles.container}>
        <h2 className="font-bold text-lg mb-4">Fasting Requests Summary</h2>

        <div className={styles.summarySection}>
          <div className={`${styles.card} ${styles.approved}`}>
            Total Fasting Requests: <b>{totalRequests}</b>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact No</th>
              <th>Fasting Date</th>
            </tr>
          </thead>
          <tbody>
            {fastingRequests.length > 0 ? (
              fastingRequests.map((req, idx) => (
                <tr key={idx}>
                  <td>{req.name || "Unknown"}</td>
                  <td>{req.phone || "N/A"}</td>
                  <td>{req.fasting_date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No fasting requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
