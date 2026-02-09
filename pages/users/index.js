

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import styles from "../../styles/users.module.css";
import Link from "next/link";
import Layout from "../../components/Layout";

import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { ChevronDown, ChevronUp, DatabaseIcon, DeleteIcon, Edit, Edit2, Edit2Icon, MoreVertical, Pen, Trash2Icon, X  } from "lucide-react";

export default function Users() {
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
  // const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;


  const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const [isMobile, setIsMobile] = useState(false);


const [deleteTarget, setDeleteTarget] = useState(null);
const [dojTarget, setDojTarget] = useState(null);
const [newDOJ, setNewDOJ] = useState("");


useEffect(() => {
  const check = () => setIsMobile(window.innerWidth <= 640);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);


  // Fetch users
  const fetchData = async () => {
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
       toast.success(t("emailSentSuccess"));
      fetchData();
    } catch (err) {
      toast.error(t("somethingWentWrong"));
      console.error("Error sending email:", err);
    }
  };

  // Open modal
  const openModal = (user) => {
    console.log("USER PARENTS:", user.parents);

    const parent =
    Array.isArray(user.parents) && user.parents.length > 0
      ? user.parents[0]
      : null;


    setModalUser(user);
    setForm({ ...user,  
    parent_name: parent?.name || "",
    parent_contact: parent?.contact || "",
    parent_address: parent?.address || "",
});
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

          parent_name: form.parent_name?.trim() || null,
  parent_contact: form.parent_contact?.trim() || null,
  parent_address: form.parent_address?.trim() || null,
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
      filtered= [...filtered].sort((a, b) => {
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

// const deleteUser = async (user) => {
//   const confirmDelete = confirm(`${t("confirmDeleteUser")} ${user.name}?`);
//   if (!confirmDelete) return;

//   const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/delete/", {
//     method: "DELETE",
//     headers: authHeaders(),
//     body: JSON.stringify({ id: user.id }),
//   });

//   const data = await res.json();

//   if (res.ok) {
//     toast.success(t("userDeletedSuccess"));
//     fetchData();
//   } else {
//     toast.error(t("somethingWentWrong"));
//   }
// };

// const changeDOJ = async (user) => {
//   const date_of_joining = prompt(t("enterNewDOJ"), user.first_attendance_date);
//   if (!date_of_joining) return;

//   const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/users/changeDOJ/", {
//     method: "PUT",
//     headers: authHeaders(),
//     body: JSON.stringify({ id: user.id, date_of_joining }),
//   });

//   const data = await res.json();
  
//   if (res.ok) {
//     toast.success(t("userUpdatedSuccess"));
//     fetchData();
//   } else {
//     toast.error(t("somethingWentWrong"));
//   }
// };


const requestDeleteUser = (user) => {
  setDeleteTarget(user);
};

const confirmDeleteUser = async () => {
  if (!deleteTarget) return;

  try {
    const res = await fetch(
      "https://bite-track-mess-management-system-a.vercel.app/api/users/delete/",
      {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ id: deleteTarget.id }),
      }
    );

    if (!res.ok) throw new Error();

    toast.success(t("userDeletedSuccess"));
    fetchData();
  } catch {
    toast.error(t("somethingWentWrong"));
  } finally {
    setDeleteTarget(null);
  }
};

const requestChangeDOJ = (user) => {
  setDojTarget(user);
  setNewDOJ(user.first_attendance_date || "");
};

const confirmChangeDOJ = async () => {
  if (!dojTarget || !newDOJ) return;

  try {
    const res = await fetch(
      "https://bite-track-mess-management-system-a.vercel.app/api/users/changeDOJ/",
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          id: dojTarget.id,
          date_of_joining: newDOJ,
        }),
      }
    );

    if (!res.ok) throw new Error();

    toast.success(t("userUpdatedSuccess"));
    fetchData();
  } catch {
    toast.error(t("somethingWentWrong"));
  } finally {
    setDojTarget(null);
    setNewDOJ("");
  }
};


 const limitedColumns = tableColumns.filter(
  (col) =>
    col.key !== "parents" &&
    col.key !== "first_attendance_date"
);

useEffect(() => {
  const onEsc = (e) => {
    if (e.key !== "Escape") return;
    setModalUser(null);
    setDeleteTarget(null);
    setDojTarget(null);
  };

  window.addEventListener("keydown", onEsc);
  return () => window.removeEventListener("keydown", onEsc);
}, []);



function MobileUserCard({ user, actions, t }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.userCard}>
      {/* Top row */}
      <div className={styles.cardTop}>
        <div>
          <strong>{user.name}</strong>
          <div className={styles.subText}>{user.email}</div>
        </div>

        {/* Three-dot menu */}
        <div className={styles.moreWrapper}>
          <button
            className={styles.moreBtn}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className={styles.moreMenu}>
              {actions.map((a, i) => (
                <button
  key={i}
  onClick={() => {
    a.onClick(user);
    setMenuOpen(false);
  }}
>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Minimal info */}
      <div className={styles.cardRow}>
        <strong>{t("phone")}:</strong> {user.phone || "-"}
      {/* Expand */}
      <button
        className={styles.expandBtn}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      </div>


      {/* Hidden details */}
      {open && (
        <div className={`${styles.details} ${open ? styles.detailsOpen : styles.detailsClosed}`}>
          <div className={styles.reviewGrid}>

          <div><span>{t("roomNo")} </span>{user.room_no}</div>
          <div><span>{t("hostel")}</span> {user.hostel_name}</div>
          <div><span>{t("course")}</span> {user.course}</div>

          {user.parents?.length > 0 && (
            <div className={styles.parents}>
              <strong>{t("parents")}</strong>
              {user.parents.map((p, i) => (
                <div key={i}>
                  {p.name} – {p.contact}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}


function ReviewCard({ user, actionButton, t }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={` ${styles.reviewCard} ${styles.userCard}`}>
      {/* Header */}
      <div className={styles.reviewHeader}>
        <strong>{user.name}
          </strong>
        <button
          className={styles.expandBtnr}
          onClick={() => setOpen(!open)}
          aria-label="Toggle details"
        >
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

      </div>
        <span className={styles.subText}>{user.email}</span>


      {/* Actions row */}

      {/* 🔽 DROPDOWN CONTENT */}
      {open && (
        <div className={`${styles.details} ${open ? styles.detailsOpen : styles.detailsClosed}`}>
      {/* ✅ ORIGINAL GRID – ALWAYS VISIBLE */}
      <div className={styles.reviewGrid}>
        <div>
          <span>{t("phone")}</span>
          {user.phone || "-"}
        </div>
        <div>
          <span>{t("roomNo")}</span>
          {user.room_no || "-"}
        </div>
        <div>
          <span>{t("hostel")}</span>
          {user.hostel_name || "-"}
        </div>
        <div>
          <span>{t("course")}</span>
          {user.course || "-"}
        </div>
      </div>
          {user.parents?.length > 0 && (
            <div className={styles.parents}>
              <strong>{t("parents")}</strong>
              {user.parents.map((p, i) => (
                <div key={i}>
                  {p.name} – {p.contact}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className={styles.cardRow}>
        {actionButton}

      </div>
    </div>
  );
}



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
                ) :  isMobile ? (
  verified.map((u) => (
    <MobileUserCard
      key={u.id}
      user={u}
      t={t}
actions={[
  {
    label: (
      <span className={`${styles.menuItem} ${styles.menuItemUpdate}`}>
        <Pen size={16} /> {t("update")}
      </span>
    ),
    onClick: () =>  openModal(u),
  },
  {
    label: (
      <span className={`${styles.menuItem} ${styles.menuItemDanger}`}>
  <Trash2Icon size={16} /> {t("delete")}
</span>

    ),
    onClick: () =>  requestDeleteUser(u),
  },
  {
    label: (
      <span className={`${styles.menuItem} ${styles.menuItemDOJ}`}>
        <DatabaseIcon size={16} /> {t("changeDOJ")}
      </span>
    ),
    onClick:() =>  requestChangeDOJ(u),
  },
]}
    />
  ))
) : (
                  renderTable(verified, tableColumns, {
                    label: t("update"),
                    render: (u) => (
                      <div className={styles.cardActions}>
                        <button className={`${styles.button} ${styles.btnEdit}`} onClick={() => openModal(u)}>
                          <Edit2Icon size={20}/>
                        </button>
                        <button className={`${styles.button} ${styles.btnDel}`} onClick={() => requestDeleteUser(u)}>
                          <Trash2Icon size={20}/>
                        </button>
                        <button className={`${styles.button} ${styles.btnDOJ}`} onClick={() => requestChangeDOJ(u)}>
                          <DatabaseIcon size={20} />
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
                isMobile ? (
  unverified.map((u) => (
    <ReviewCard
      key={u.id}
      user={u}
      t={t}
      actionButton={
        <Link
          href={`/quickSettings/verify?email=${encodeURIComponent(u.email)}`}
          className={styles.link}
        >
          <button className={`${styles.cardbtn} ${styles.button}`}>
            {t("verify")}
          </button>
        </Link>
      }
    />
  ))
) : (

                renderTable(unverified, limitedColumns, {
                  label: t("verify"),
                  render: (u) => (
                    <Link
                      href={`/quickSettings/verify?email=${encodeURIComponent(u.email)}`}
                      className={styles.link}
                    >
                      <button className={styles.button}>{t("verify")}</button>
                    </Link>
                  ),
                }))
              ))}

            {activeTab === "unmailed" &&
              (unmailed.length === 0 ? (
                <div className={styles.empty}>{t("noUsersToSendMail")}</div>
              ) : (
                isMobile ? (
  unmailed.map((u) => (
    <ReviewCard
      key={u.id}
      user={u}
      t={t}
      actionButton={
        <button
          className={`${styles.cardbtn} ${styles.button}`}
          onClick={() => handleSendMail(u)}
        >
          {t("sendEmail")}
        </button>
      }
    />
  ))
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
              )
              ))}
          </>
        )}

        {modalUser && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>

              <h2>{t("updateUser")}</h2>
               <button
    className={styles.modalClose}
    onClick={() => setModalUser(null)}
    aria-label="Close modal"
    >
    <X size={20} />
  </button>
    </div>

              <div  className={styles.modalBody} style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "0.5rem" }}>
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


        {deleteTarget && (
  <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
    <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
      <h3>{t("confirmDelete")}</h3>

      <p>
        {t("confirmDeleteUser")}{" "}
        <strong>{deleteTarget.name}</strong>?
      </p>

      <div className={styles.modalActions}>
        <button
          className={`${styles.button} ${styles.btnDel}`}
          onClick={confirmDeleteUser}
        >
          {t("delete")}
        </button>

        <button
          className={styles.buttonCancel}
          onClick={() => setDeleteTarget(null)}
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  </div>
)}


{dojTarget && (
  <div className={styles.modalOverlay} onClick={() => setDojTarget(null)}>
    <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
      <h3>{t("changeDOJ")}</h3>

      <label>
        {t("dateOfJoining")}
        <input
          type="date"
          value={newDOJ}
          onChange={(e) => setNewDOJ(e.target.value)}
        />
      </label>

      <div className={styles.modalActions}>
        <button
          className={`${styles.button} ${styles.btnDOJ}`}
          onClick={confirmChangeDOJ}
        >
          {t("save")}
        </button>

        <button
          className={styles.buttonCancel}
          onClick={() => setDojTarget(null)}
        >
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
