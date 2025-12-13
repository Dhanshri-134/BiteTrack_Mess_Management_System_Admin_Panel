
// import { useEffect, useState } from "react";
// import Layout from "../../components/Layout";
// import styles from "../../styles/fasting.module.css";
// import useAuth from "../../hooks/useAuth";

// export default function FastingRequests() {
//   useAuth(); 
//   const [fastingRequests, setFastingRequests] = useState([]);
//   const [totalRequests, setTotalRequests] = useState(0);

//   const [token, setToken] = useState(null);

//   useEffect(() => {
//     const t = localStorage.getItem("token");
//     setToken(t);
//   }, []);
//   const fetchData = async () => {
//     if (!token) return;

//     try {
//       const res = await fetch(`/api/menu/fasting/fetch`, {
//         method: "GET",
//         headers: {
//           "Authorization": `Bearer ${token}`,
//         },
//       });

//       if (!res.ok) throw new Error("Failed to fetch fasting requests");

//       const data = await res.json();

//       // fastingRequests contains [{ name, phone, fasting_date }, ...]
//       setFastingRequests(data.fastingRequests || []);
//       setTotalRequests(data.totalRequests || 0);

//     } catch (err) {
//       console.error("Error fetching fasting requests:", err);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, [token]);

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
//               <th>Name</th>
//               <th>Contact No</th>
//               <th>Fasting Date</th>
//             </tr>
//           </thead>
//           <tbody>
//             {fastingRequests.length > 0 ? (
//               fastingRequests.map((req, idx) => (
//                 <tr key={idx}>
//                   <td>{req.name || "Unknown"}</td>
//                   <td>{req.phone || "N/A"}</td>
//                   <td>{req.fasting_date}</td>
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
import dynamic from "next/dynamic";
import Layout from "../../components/Layout";
import styles from "../../styles/fasting.module.css";
import useAuth from "../../hooks/useAuth";

function FastingRequests() {
  useAuth(); 
  const [fastingRequests, setFastingRequests] = useState([]);
  const [totalRequests, setTotalRequests] = useState(0);

  const [token, setToken] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    setToken(t);
  }, []);

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

export default dynamic(() => Promise.resolve(FastingRequests), {
  ssr: false,
});
