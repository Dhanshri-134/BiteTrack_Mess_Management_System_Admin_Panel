// import { useEffect, useState } from "react";
// import Sidebar from "../components/Sidebar";
// import styles from "../styles/users.module.css";
// import Link from "next/link";
// import Layout from "../components/Layout";
// import useAuth from "../hooks/useAuth";
// import { offlineFetch } from "../lib/offlineFetch";
// import toast from "react-hot-toast";

// export default function Users() {
//   useAuth(); // Ensure user is authenticated
//   const [verified, setVerified] = useState([]);
//   const [unverified, setUnverified] = useState([]);
//   const [unmailed, setUnmailed] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
//   const [modalUser, setModalUser] = useState(null);
//   const [form, setForm] = useState({});
//   const [activeTab, setActiveTab] = useState("verified"); // 👈 Default tab


//   const authHeaders = () => {
//   const token = localStorage.getItem("token");
//   return {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${token}`,
//   };
// };


//   // Fetch users
//   const fetchData = async () => {
//   setLoading(true);
//   try {
//     const data = await offlineFetch("users-tabs", async () => {
//       const [vRes, uRes, umRes] = await Promise.all([
//         fetch(
//           "https://bite-track-mess-management-system-a.vercel.app/api/users/verified/",
//           { headers: authHeaders() }
//         ),
//         fetch(
//           "https://bite-track-mess-management-system-a.vercel.app/api/users/unverified/",
//           { headers: authHeaders() }
//         ),
//         fetch(
//           "https://bite-track-mess-management-system-a.vercel.app/api/users/unmailed/",
//           { headers: authHeaders() }
//         ),
//       ]);

//       if (!vRes.ok || !uRes.ok || !umRes.ok) {
//         throw new Error("Failed to fetch users");
//       }

//       const [vData, uData, umData] = await Promise.all([
//         vRes.json(),
//         uRes.json(),
//         umRes.json(),
//       ]);

//       return {
//         verified: Array.isArray(vData) ? vData : [],
//         unverified: Array.isArray(uData) ? uData : [],
//         unmailed: Array.isArray(umData) ? umData : [],
//       };
//     });

//     setVerified(data.verified || []);
//     setUnverified(data.unverified || []);
//     setUnmailed(data.unmailed || []);
//   } catch (err) {
//     console.error(err);
//     setVerified([]);
//     setUnverified([]);
//     setUnmailed([]);
//   } finally {
//     setLoading(false);
//   }
// };


//   useEffect(() => {
//     fetchData();
//   }, []);

//   // Send verification email
//   const handleSendMail = async (user) => {
//     try {
//       await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/sendmail/", {
//         method: "POST",
//         // headers: { "Content-Type": "application/json" },
//         headers: authHeaders(),
//         body: JSON.stringify({ userId: user.id, email: user.email }),
//       });
//       fetchData();
//     } catch (err) {
//       console.error("Error sending email:", err);
//     }
//   };

//   // Open modal
//   const openModal = (user) => {
//     setModalUser(user);
//     setForm({ ...user });
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   };

//   // Update user
//   const handleUpdate = async () => {
//   try {
//     // Update user details
//     const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/update/", {
//       method: "PUT",
//       // headers: { "Content-Type": "application/json" },
//       headers: authHeaders(),
//       body: JSON.stringify(form),
//     });
//     const data = await res.json();

//     if (!res.ok) {
//       toast.error("Something went wrong. Please try again.");
//       return;
//     }

//     // Update parent details
//     const parentData = {
//       user_id: modalUser.id,
//       name: form.parent_name,
//       contact: form.parent_contact,
//       address: form.parent_address,
//     };

//     await fetch("https://bite-track-mess-management-system-a.vercel.app/api/parents/update/", {
//       method: "PUT",
//       // headers: { "Content-Type": "application/json" },
//       headers: authHeaders(),
//       body: JSON.stringify(parentData),
//     });

//     fetchData();
//     setModalUser(null);
//   } catch (err) {
//     console.error(err);
//   }
// };

//   // Search + Sort
//   const filterAndSort = (users) => {
//     let filtered = users;
//     if (search) {
//       filtered = filtered.filter(
//         (u) =>
//           u.name?.toLowerCase().includes(search.toLowerCase()) ||
//           u.email?.toLowerCase().includes(search.toLowerCase()) ||
//           u.phone?.toLowerCase().includes(search.toLowerCase())
//       );
//     }
//     if (sortConfig.key) {
//       filtered.sort((a, b) => {
//         const aVal = a[sortConfig.key] || "";
//         const bVal = b[sortConfig.key] || "";
//         if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
//         if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
//         return 0;
//       });
//     }
//     return filtered;
//   };

//   const requestSort = (key) => {
//     let direction = "asc";
//     if (sortConfig.key === key && sortConfig.direction === "asc")
//       direction = "desc";
//     setSortConfig({ key, direction });
//   };

//   const renderSortArrow = (key) => {
//     if (sortConfig.key !== key) return null;
//     return sortConfig.direction === "asc" ? " ▲" : " ▼";
//   };

//   const tableColumns = [
//     { key: "name", label: "Name" },
//     { key: "first_name", label: "First Name" },
//     { key: "last_name", label: "Last Name" },
//     { key: "email", label: "Email" },
//     { key: "phone", label: "Phone" },
//     { key: "room_no", label: "Room No" },
//     { key: "hostel_name", label: "Hostel" },
//     { key: "course", label: "Course" },
//     { key: "date_of_joining", label: "Date of Joining" },
//     { key: "first_attendance_date", label: "first attendance date" },
//     {
//       key: "parents",
//       label: "Parents",
//       render: (u) =>
//         u.parents && u.parents.length > 0 ? (
//           u.parents.map((p, i) => (
//             <div key={i} style={{ marginBottom: "0.5rem" }}>
//               <strong>{p.name}</strong> ({p.contact})
//               <br />
//               {p.address}
//             </div>
//           ))
//         ) : (
//           <span style={{ color: "#6b7280" }}>No parents</span>
//         ),
//     },
//   ];

//   const renderTable = (users, columns, actions = null) => (
//     <div className={styles.tableContainer}>
//       <table className={styles.table}>
//         <thead>
//           <tr>
//             {columns.map((col) => (
//               <th
//                 key={col.key}
//                 onClick={() => requestSort(col.key)}
//                 style={{ cursor: "pointer" }}
//               >
//                 {col.label} {renderSortArrow(col.key)}
//               </th>
//             ))}
//             {actions && <th>{actions.label}</th>}
//           </tr>
//         </thead>
//         <tbody>
//           {filterAndSort(users).map((u) => (
//             <tr key={u.id}>
//               {columns.map((col) => (
//                 // <td key={col.key} data-label={col.label}>
//                 //   {col.render ? col.render(u) : u[col.key]}
//                 // </td>
//                 <td key={col.key} data-label={col.label}>
//   {(() => {
//     const value = u[col.key];
//     if (!value) return ""; // handle nulls

//     // Detect if this is a date field and format
//     if (col.key === "date_of_joining" || col.key === "created_at" || col.key === "first_attendance_date") {
//       const date = new Date(value);
//       // Format to local date (India time)
//       return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
//     }

    

//     return col.render ? col.render(u) : value;
//   })()}
// </td>

//               ))}
//               {actions && <td>{actions.render(u)}</td>}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );

// const deleteUser = async (user) => {
//   const confirmDelete = confirm(`Are you sure you want to delete ${user.name}?`);
//   if (!confirmDelete) return;

//   const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/delete/", {
//     method: "DELETE", // ✅ use DELETE
//     // headers: { "Content-Type": "application/json" },
//     headers: authHeaders(),
//     body: JSON.stringify({ id: user.id }), // ✅ use id
//   });

//   const data = await res.json();

//   if (res.ok) {
//     toast.success("User deleted successfully");
//     fetchData(); // Refresh user list
//   } else {
//     toast.error("Something went wrong. Please try again.");
//   }
// };


// const changeDOJ = async (user) => {
  
//   const date_of_joining = prompt("Enter new Date of Joining (YYYY-MM-DD):", user.first_attendance_date);
//   if (!date_of_joining) return;

//   const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/changeDOJ/", {
//     method: "PUT",
//     // headers: { "Content-Type": "application/json" },
//     headers: authHeaders(),
//     body: JSON.stringify({ id: user.id, date_of_joining }),
//   });

//   const data = await res.json();
  
//   if (res.ok) {
//     toast.success("User updated successfully");
//     fetchData();
//   } else {
//     toast.error("Something went wrong. Please try again.");
//   }
//   console.log(data);
// };


    

// return (
//   <Layout>
//     <div className={styles.container}>
//       <main className={styles.main}>
//         <h1>User Management</h1>

//         {/* Search */}
//         <input
//           type="text"
//           placeholder="Search by name or email"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className={styles.search}
//         />

//         {/* Tabs */}
//         <div className={styles.tabs}>
//           <button
//             className={`${styles.tabBtn} ${
//               activeTab === "verified" ? styles.activeTab : ""
//             }`}
//             onClick={() => setActiveTab("verified")}
//           >
//             Verified Users ({verified.length})
//           </button>

//           <button
//             className={`${styles.tabBtn} ${
//               activeTab === "unverified" ? styles.activeTab : ""
//             }`}
//             onClick={() => setActiveTab("unverified")}
//           >
//             Pending Verification ({unverified.length})
//           </button>

//           <button
//             className={`${styles.tabBtn} ${
//               activeTab === "unmailed" ? styles.activeTab : ""
//             }`}
//             onClick={() => setActiveTab("unmailed")}
//           >
//             Send Mail ({unmailed.length})
//           </button>
//         </div>

//         {/* Content */}
//         {loading ? (
//           <div className={styles.loading}>Loading...</div>
//         ) : (
//           <>
//             {/* VERIFIED USERS */}
//            {/* Verified Users */}
// {activeTab === "verified" && (
//   <div className="verifiedSection">
//     {verified.length === 0 ? (
//       <div className={styles.empty}>No verified users</div>
//     ) : (
//       renderTable(verified, tableColumns, {
//         label: "Update",
//         render: (u) => (
//           <div className={styles.cardActions}>
//             <button className={styles.button} onClick={() => openModal(u)}>
//               Update
//             </button>
//             <button className={styles.button} onClick={() => deleteUser(u)}>
//               Delete
//             </button>
//             <button className={styles.button} onClick={() => changeDOJ(u)}>
//               Change DOJ
//             </button>
//           </div>
//         ),
//       })
//     )}
//   </div>
// )}

//             {/* UNVERIFIED USERS */}
//             {activeTab === "unverified" &&
//               (unverified.length === 0 ? (
//                 <div className={styles.empty}>No unverified users</div>
//               ) : (
//                 renderTable(unverified, tableColumns, {
//                   label: "Verify",
//                   render: (u) => (
//                     <Link
//                       href={`/verify?email=${encodeURIComponent(u.email)}`}
//                       className={styles.link}
//                     >
//                       <button className={styles.button}>Verify</button>
//                     </Link>
//                   ),
//                 })
//               ))}

//             {/* UNMAILED USERS */}
//             {activeTab === "unmailed" &&
//               (unmailed.length === 0 ? (
//                 <div className={styles.empty}>No users to send mail</div>
//               ) : (
//                 renderTable(unmailed, tableColumns, {
//                   label: "Send Mail",
//                   render: (u) => (
//                     <button
//                       className={styles.button}
//                       onClick={() => handleSendMail(u)}
//                     >
//                       Send Email
//                     </button>
//                   ),
//                 })
//               ))}
//           </>
//         )}

//         {/* UPDATE MODAL */}
//         {modalUser && (
//           <div className={styles.modalOverlay}>
//             <div className={styles.modal}>
//               <h2>Update User</h2>

//               <div
//                 style={{
//                   maxHeight: "70svh",
//                   overflowY: "auto",
//                   paddingRight: "0.5rem",
//                 }}
//               >
//                 <label>
//                   First Name:
//                   <input
//                     name="first_name"
//                     value={form.first_name}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Last Name:
//                   <input
//                     name="last_name"
//                     value={form.last_name}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Phone:
//                   <input
//                     name="phone"
//                     value={form.phone}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Mobile:
//                   <input
//                     name="mobile"
//                     value={form.mobile}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Room No:
//                   <input
//                     name="room_no"
//                     value={form.room_no}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Hostel:
//                   <input
//                     name="hostel_name"
//                     value={form.hostel_name}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Course:
//                   <input
//                     name="course"
//                     value={form.course}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <h3 style={{ marginTop: "1rem" }}>Parent Details</h3>

//                 <label>
//                   Parent Name:
//                   <input
//                     name="parent_name"
//                     value={form.parent_name || ""}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Parent Contact:
//                   <input
//                     name="parent_contact"
//                     value={form.parent_contact || ""}
//                     onChange={handleChange}
//                   />
//                 </label>

//                 <label>
//                   Parent Address:
//                   <input
//                     name="parent_address"
//                     value={form.parent_address || ""}
//                     onChange={handleChange}
//                   />
//                 </label>
//               </div>

//               <div className={styles.modalActions}>
//                 <button
//                   onClick={handleUpdate}
//                   className={styles.button}
//                 >
//                   Save
//                 </button>

//                 <button
//                   onClick={() => setModalUser(null)}
//                   className={styles.buttonCancel}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </main>
//     </div>
//   </Layout>
// );

// }



import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import styles from "../styles/users.module.css";
import Link from "next/link";
import Layout from "../components/Layout";
import useAuth from "../hooks/useAuth";
import { offlineFetch } from "../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";

export default function Users() {
  useAuth(); // Ensure user is authenticated
  const { t } = useLanguage();
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


  // Fetch users
  const fetchData = async () => {
  setLoading(true);
  try {
    const data = await offlineFetch("users-tabs", async () => {
      const [vRes, uRes, umRes] = await Promise.all([
        fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/verified/",
          { headers: authHeaders() }
        ),
        fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/unverified/",
          { headers: authHeaders() }
        ),
        fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/unmailed/",
          { headers: authHeaders() }
        ),
      ]);

      if (!vRes.ok || !uRes.ok || !umRes.ok) {
        throw new Error("Failed to fetch users");
      }

      const [vData, uData, umData] = await Promise.all([
        vRes.json(),
        uRes.json(),
        umRes.json(),
      ]);

      return {
        verified: Array.isArray(vData) ? vData : [],
        unverified: Array.isArray(uData) ? uData : [],
        unmailed: Array.isArray(umData) ? umData : [],
      };
    });

    setVerified(data.verified || []);
    setUnverified(data.unverified || []);
    setUnmailed(data.unmailed || []);
  } catch (err) {
    console.error(err);
    setVerified([]);
    setUnverified([]);
    setUnmailed([]);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchData();
  }, []);

  // Send verification email
  const handleSendMail = async (user) => {
    try {
      await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/sendmail/", {
        method: "POST",
        // headers: { "Content-Type": "application/json" },
        headers: authHeaders(),
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      fetchData();
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
    const res = await fetch(
      "https://bite-track-mess-management-system-a.vercel.app/api/update/",
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          id: modalUser.id,                 // ✅ REQUIRED
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          room_no: form.room_no,
          hostel_name: form.hostel_name,
          course: form.course,

          // ✅ parents handled HERE
          parent_name: form.parent_name,
          parent_contact: form.parent_contact,
          parent_address: form.parent_address,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      toast.error(t("somethingWentWrong"));
      return;
    }

    toast.success(t("userUpdatedSuccess"));
    fetchData();
    setModalUser(null);
  } catch (err) {
    console.error(err);
    toast.error(t("somethingWentWrong"));
  }
};


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
    { key: "name", label: t("name") },
    { key: "first_name", label: t("firstName") },
    { key: "last_name", label: t("lastName") },
    { key: "email", label: t("email") },
    { key: "phone", label: t("phone") },
    { key: "room_no", label: t("roomNo") },
    { key: "hostel_name", label: t("hostel") },
    { key: "course", label: t("course") },
    { key: "date_of_joining", label: t("dateOfJoining") },
    { key: "first_attendance_date", label: t("firstAttendanceDate") },
    {
      key: "parents",
      label: t("parents"),
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
          <span style={{ color: "#6b7280" }}>{t("noParents")}</span>
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
                <td key={col.key} data-label={col.label}>
                  {(() => {
                    const value = u[col.key];
                    if (!value) return "";
                    if (col.key === "date_of_joining" || col.key === "created_at" || col.key === "first_attendance_date") {
                      const date = new Date(value);
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
  const confirmDelete = confirm(`${t("confirmDeleteUser")} ${user.name}?`);
  if (!confirmDelete) return;

  const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/delete/", {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify({ id: user.id }),
  });

  const data = await res.json();

  if (res.ok) {
    toast.success(t("userDeletedSuccess"));
    fetchData();
  } else {
    toast.error(t("somethingWentWrong"));
  }
};

const changeDOJ = async (user) => {
  const date_of_joining = prompt(t("enterNewDOJ"), user.first_attendance_date);
  if (!date_of_joining) return;

  const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/changeDOJ/", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ id: user.id, date_of_joining }),
  });

  const data = await res.json();
  
  if (res.ok) {
    toast.success(t("userUpdatedSuccess"));
    fetchData();
  } else {
    toast.error(t("somethingWentWrong"));
  }
};
 const limitedColumns = tableColumns.filter(
  (col) =>
    col.key !== "parents" &&
    col.key !== "first_attendance_date"
);

return (
  <Layout>
    <div className={styles.container}>
      <main className={styles.main}>
        <h1>{t("userManagement")}</h1>

        <input
          type="text"
          placeholder={t("searchByNameOrEmail")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />

        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === "verified" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("verified")}
          >
            {t("verifiedUsers")} ({verified.length})
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "unverified" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("unverified")}
          >
            {t("pendingVerification")} ({unverified.length})
          </button>

          <button
            className={`${styles.tabBtn} ${activeTab === "unmailed" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("unmailed")}
          >
            {t("sendMail")} ({unmailed.length})
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>{t("loading")}</div>
        ) : (
          <>
            {activeTab === "verified" && (
              <div className="verifiedSection">
                {verified.length === 0 ? (
                  <div className={styles.empty}>{t("noVerifiedUsers")}</div>
                ) : (
                  renderTable(verified, tableColumns, {
                    label: t("update"),
                    render: (u) => (
                      <div className={styles.cardActions}>
                        <button className={styles.button} onClick={() => openModal(u)}>
                          {t("update")}
                        </button>
                        <button className={styles.button} onClick={() => deleteUser(u)}>
                          {t("delete")}
                        </button>
                        <button className={styles.button} onClick={() => changeDOJ(u)}>
                          {t("changeDOJ")}
                        </button>
                      </div>
                    ),
                  })
                )}
              </div>
            )}

            {activeTab === "unverified" &&
              (unverified.length === 0 ? (
                <div className={styles.empty}>{t("noUnverifiedUsers")}</div>
              ) : (
                renderTable(unverified, limitedColumns, {
                  label: t("verify"),
                  render: (u) => (
                    <Link
                      href={`/verify?email=${encodeURIComponent(u.email)}`}
                      className={styles.link}
                    >
                      <button className={styles.button}>{t("verify")}</button>
                    </Link>
                  ),
                })
              ))}

            {activeTab === "unmailed" &&
              (unmailed.length === 0 ? (
                <div className={styles.empty}>{t("noUsersToSendMail")}</div>
              ) : (
                renderTable(unmailed, limitedColumns, {
                  label: t("sendMail"),
                  render: (u) => (
                    <button
                      className={styles.button}
                      onClick={() => handleSendMail(u)}
                    >
                      {t("sendEmail")}
                    </button>
                  ),
                })
              ))}
          </>
        )}

        {modalUser && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>{t("updateUser")}</h2>

              <div style={{ maxHeight: "70svh", overflowY: "auto", paddingRight: "0.5rem" }}>
                <label>
                  {t("firstName")}:
                  <input name="first_name" value={form.first_name} onChange={handleChange} />
                </label>

                <label>
                  {t("lastName")}:
                  <input name="last_name" value={form.last_name} onChange={handleChange} />
                </label>

                <label>
                  {t("phone")}:
                  <input name="phone" value={form.phone} onChange={handleChange} />
                </label>

                <label>
                  Mobile:
                  <input name="mobile" value={form.mobile} onChange={handleChange} />
                </label>

                <label>
                  {t("roomNo")}:
                  <input name="room_no" value={form.room_no} onChange={handleChange} />
                </label>

                <label>
                  {t("hostel")}:
                  <input name="hostel_name" value={form.hostel_name} onChange={handleChange} />
                </label>

                <label>
                  {t("course")}:
                  <input name="course" value={form.course} onChange={handleChange} />
                </label>

                <h3 style={{ marginTop: "1rem" }}>{t("parentDetails")}</h3>

                <label>
                  {t("parentName")}:
                  <input name="parent_name" value={form.parent_name || ""} onChange={handleChange} />
                </label>

                <label>
                  {t("parentContact")}:
                  <input name="parent_contact" value={form.parent_contact || ""} onChange={handleChange} />
                </label>

                <label>
                  {t("parentAddress")}:
                  <input name="parent_address" value={form.parent_address || ""} onChange={handleChange} />
                </label>
              </div>

              <div className={styles.modalActions}>
                <button onClick={handleUpdate} className={styles.button}>
                  {t("save")}
                </button>

                <button onClick={() => setModalUser(null)} className={styles.buttonCancel}>
                  {t("cancel")}
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
