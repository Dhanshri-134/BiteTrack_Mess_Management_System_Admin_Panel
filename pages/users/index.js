
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/Sidebar";
import styles from "../../styles/users.module.css";
import Link from "next/link";
import Layout from "../../components/Layout";
import { API_BASE } from "../../lib/api";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { ChevronDown, ChevronUp, CloudAlert, DatabaseIcon, DeleteIcon, Edit, Edit2, Edit2Icon, FireExtinguisher, LucideCircleStop, MoreVertical, Pen, Search, StopCircle, Trash2Icon, X } from "lucide-react";
import { useAppRefresh } from "@/lib/useAppRefresh";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveJsPdfDocument } from "../../lib/fileDownload";
import GlobalLoader from "../../components/GlobalLoader"

export default function Users() {
  const router = useRouter();
  const userRefs = useRef({});
  const { t } = useLanguage();
  const [verified, setVerified] = useState([]);
  const [unverified, setUnverified] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messInfo, setMessInfo] = useState(null);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [modalUser, setModalUser] = useState(null);
  const [form, setForm] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dojTarget, setDojTarget] = useState(null);
  const [newDOJ, setNewDOJ] = useState("");
  const [activeTab, setActiveTab] = useState("verified");
  const [openAccordionId, setOpenAccordionId] = useState(null);
  const [freezeModal, setFreezeModal] = useState(null);
  const [freezeTarget, setFreezeTarget] = useState(null);
  const [exporting, setExporting] = useState(false);

const { id } = router.query;

useEffect(() => {
  if (!id || verified.length === 0) return;

  const user = verified.find(u => String(u.id) === String(id));

  if (user) {
    setActiveTab("verified");

    setTimeout(() => {
      userRefs.current[id]?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      userRefs.current[id]?.classList.add(styles.highlight);

      setTimeout(() => {
        userRefs.current[id]?.classList.remove(styles.highlight);
      }, 2000);
    }, 300);
  }
}, [id, verified]);

  const goToBilling = (user) => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();

    router.push(
      `/billing?userId=${user.id}&month=${month}&year=${year}`
    );
  };

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const openModal = (user) => {
    console.log("USER PARENTS:", user.parents);

    const parent =
      Array.isArray(user.parents) && user.parents.length > 0
        ? user.parents[0]
        : null;


    setModalUser(user);
    setForm({
      ...user,
      parent_name: parent?.name || "",
      parent_contact: parent?.contact || "",
      parent_address: parent?.address || "",
    });
  };

  const fetchData = async () => {
    try {

      const token = localStorage.getItem("token");

      const messRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/mess/details/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (messRes.ok) {
        const mess = await messRes.json();
        setMessInfo(mess);
      }

      const data = await offlineFetch("users-tabs", async () => {
        const [vRes, uRes] = await Promise.all([
          fetch(

            `https://bite-track-mess-management-system-a.vercel.app/api/users/verified/`,
            { headers: authHeaders() }
          ),
          fetch(
            `https://bite-track-mess-management-system-a.vercel.app/api/users/unverified/`,
            { headers: authHeaders() }
          )
        ]);

        if (!vRes.ok || !uRes.ok) {
          throw new Error("Failed to fetch users");
        }

        const [vData, uData] = await Promise.all([
          vRes.json(),
          uRes.json(),
        ]);

        return {
          verified: Array.isArray(vData) ? vData : [],
          unverified: Array.isArray(uData) ? uData : [],
        };
      });

      setVerified(data.verified || []);
      setUnverified(data.unverified || []);
    } catch (err) {
      console.error(err);
      setVerified([]);
      setUnverified([]);
    } finally {
      setLoading(false);
    }
  };


  const loadImageAsBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/update/`,
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


  const confirmFreezeUser = async () => {

    if (!freezeTarget) return;

    const { user, action } = freezeTarget;

    await toggleFreeze(user.id, action);

    setFreezeTarget(null);
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
      filtered = [...filtered].sort((a, b) => {
        let aVal;
        let bVal;

        if (sortConfig.key === "hostel_room") {
          aVal = `${a.hostel_name || ""} ${a.course || ""} ${a.room_no || ""}`;
          bVal = `${b.hostel_name || ""} ${b.course || ""} ${b.room_no || ""}`;
        } else if (sortConfig.key === "name_email") {
          aVal = a.name || "";
          bVal = b.name || "";
        } else if (sortConfig.key === "parents") {
          aVal = a.parents?.[0]?.name || "";
          bVal = b.parents?.[0]?.name || "";
        } else {
          aVal = a[sortConfig.key] || "";
          bVal = b[sortConfig.key] || "";
        }

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
    {
      key: "name_email",
      label: t("name"),
      render: (u) => (
        <div>
          <strong
            style={{ cursor: "pointer" }}
            onClick={() => goToBilling(u)}
          >
            {u.name}
          </strong>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {u.email}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {u.phone}
          </div>

        </div>
      ),
    },

    {
      key: "hostel_room",
      label: t("hostel"),
      render: (u) => (
        <div>
          {u.course}
          <br></br>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {u.hostel_name || "-"}
            <br></br>
            {u.room_no || "-"}
          </div>
        </div>
      ),
    },

    {
      key: "date_of_joining",
      label: t("dateOfJoining"),
      render: (u) =>
        u.date_of_joining
          ? new Date(u.date_of_joining).toLocaleDateString("en-IN")
          : "-",
    },

    {
      key: "parents",
      label: t("parents"),
      render: (u) =>
        u.parents?.length ? (
          u.parents.map((p, i) => (
            <div key={i}>
              <strong>{p.name}</strong>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                {p.contact}
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    maxWidth: "200px"
                  }}
                >
                  {p.address}
                </div>
              </div>
            </div>
          ))
        ) : (
          <span style={{ color: "#9CA3AF" }}>—</span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (u) => {
        if (activeTab !== "verified") return null;

        return (
          <div className={styles.buttonwrapper}>
            {/* <span className={styles.actionTrigger}>Click Here</span> */}

           {/* <div className={styles.actionMenu}> */}
              <button  className={styles.btn}onClick={() => openModal(u)}>Edit</button>
              <button  className={styles.btn}onClick={() => requestDeleteUser(u)}>Delete</button>
              <button  className={styles.btn}onClick={() => requestChangeDOJ(u)}>Change DOJ</button>
              <button  className={styles.btn}
                onClick={() => {
                  const action = u.status === "Active" ? "freeze" : "unfreeze";

                  setFreezeTarget({
                    user: u,
                    action
                  });
                }}
              >
                {u.status === "Active" ? "Freeze" : "Unfreeze"}
              </button>
           {/* </div> */}
          </div>
        )
      }
    }
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
            <tr key={u.id} ref={(el) => (userRefs.current[u.id] = el)}>
              {columns.map((col) => (
                <td key={col.key} data-label={col.label}>
                  {(() => {
                    if (col.render) {
                      return col.render(u);
                    }

                    const value = u[col.key];
                    return value;

                    if (col.key === "name") {
                      return (
                        <span
                          style={{ cursor: "pointer" }}
                          onClick={() => goToBilling(u)}
                        >
                          {value}
                        </span>
                      );
                    }

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

  const requestDeleteUser = (user) => {
    setDeleteTarget(user);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/users/delete/`,
        // `/api/users/delete/`,
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
        `https://bite-track-mess-management-system-a.vercel.app/api/users/changeDOJ/`,
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
      col.key !== "first_attendance_date" &&
      col.key !== "actions"
  );

  function MobileUserCard({ user, actions, t, openAccordionId, setOpenAccordionId }) {
    const isOpen = openAccordionId === user.id;

    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <div className={styles.userCard} >
        {/* Top row */}
        <div className={styles.cardTop} >
          <div>
            <strong style={{ cursor: "pointer" }}
              onClick={() => goToBilling(user)}>
              {user.name}
            </strong>
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
              <div className={styles.moreMenu} onClick={(e) => e.stopPropagation()}>
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
            onClick={() => setOpenAccordionId(openAccordionId === user.id ? null : user.id)
            }
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>


        {/* Hidden details */}
        {openAccordionId === user.id && (
          <div className={`${styles.details} ${isOpen ? styles.detailsOpen : styles.detailsClosed}`}>
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

  function ReviewCard({ user, actionButton, t, openAccordionId, setOpenAccordionId }) {
    const isOpen = openAccordionId === user.id;

    return (
      <div className={` ${styles.reviewCard} ${styles.userCard}`}>
        {/* Header */}
        <div className={styles.reviewHeader}>
          <strong>{user.name}
          </strong>
          <button
            className={styles.expandBtnr}
            onClick={() => setOpenAccordionId(openAccordionId === user.id ? null : user.id)
            }
            aria-label="Toggle details"
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

        </div>
        <span className={styles.subText}>{user.email}</span>


        {/* Actions row */}

        {/* 🔽 DROPDOWN CONTENT */}
        {openAccordionId === user.id && (
          <div className={`${styles.details} ${isOpen ? styles.detailsOpen : styles.detailsClosed}`}>
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

  const toggleFreeze = async (userId, action) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/bills/toggle-freeze/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, action }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        return toast.error(t("somethingWentWrong"));
      }

      // ✅ Update UI status
      setVerified((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: action === "freeze" ? "Inactive" : "Active" }
            : u
        )
      );

      setUnverified((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: action === "freeze" ? "Inactive" : "Active" }
            : u
        )
      );

      // ✅ OPEN MODAL HERE
      setFreezeModal({
        action,
        message:
          action === "freeze"
            ? "User has been frozen. Billing stopped from freeze date."
            : "User has been unfrozen. Billing resumed.",
        user: data.user || null, // if backend returns user
      });

    } catch (err) {
      console.error(err);
      toast.error(t("somethingWentWrong"));
    }
  };

  const handleExportUsersPDF = async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem("token");

      const messRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/mess/details/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const mess = await messRes.json();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      let logoUrl = mess.logo || "/Assets/logo_Bite_Track.png";

      let logoBase64 = null;
      try {
        logoBase64 = await loadImageAsBase64(logoUrl);
      } catch {
        logoBase64 = await loadImageAsBase64("/Assets/logo_Bite_Track.png");
      }

      // Header background
      doc.setFillColor(0, 113, 112);
      doc.rect(0, 0, pageWidth, 40, "F");

      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", 14, 6.5, 30, 30);
      }

      // Mess Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");

      doc.text(
        mess.name,
        pageWidth - 14,
        15,
        { align: "right" }
      );

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      doc.text(mess.location || "", pageWidth - 14, 22, { align: "right" });
      doc.text(mess.email || "", pageWidth - 14, 28, { align: "right" });
doc.text(String(mess.contact_info || ""), pageWidth - 14, 33, { align: "right" });
      const now = new Date();
      const month = now.toLocaleString("en-IN", { month: "long" });
      const year = now.getFullYear();

      doc.setFontSize(9);
      doc.text(
        `Generated: ${month} ${year}`,
        pageWidth - 14,
        38,
        { align: "right" }
      );

      doc.setTextColor(0, 0, 0);

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 55, pageWidth - 14, 55);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Users List", 14, 50);

      // Alphabetical order


      const sortedUsers = [...verified].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );

      autoTable(doc, {
        startY: 60,

        head: [["Name / Email", "Phone", "Course", "Hostel / Room", "DOJ"]],

        body: sortedUsers.map((u) => [
          `${u.name || "-"}\n${u.email || ""}`,
          u.phone || "-",
          u.course || "-",
          `${u.hostel_name || "-"}\nRoom: ${u.room_no || "-"}`,
          u.date_of_joining
            ? new Date(u.date_of_joining).toLocaleDateString("en-IN")
            : "-"
        ]),

        headStyles: {
          fillColor: [0, 113, 112],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },

        styles: {
          fontSize: 9,
          cellPadding: 4,
          valign: "middle",
        },

        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 45 },
          4: { cellWidth: 30 }
        },

        alternateRowStyles: {
          fillColor: [240, 250, 250]
        }
      });

      const fileName = `${mess.name.replace(/\s+/g, "_")}_Users.pdf`;

      await saveJsPdfDocument(doc, fileName);

    } catch (err) {
      console.error(err);
      toast.error(t("somethingWentWrong"));
    } finally {
      setExporting(false);
    }
  };



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

  useAppRefresh(fetchData);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setOpenAccordionId(null);
  }, [activeTab]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filteredVerified = filterAndSort(verified);
  const filteredUnverified = filterAndSort(unverified);

  if (exporting) return <GlobalLoader />;
  return (

    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
        
      {/* <section className={styles.heroSection}>
        <div>
          <p className={styles.eyebrow}>{t("users")}</p>
          <div className={styles.header}>

            <h1 className={styles.heroTitle}>{t("userManagement")}</h1>
            <button
              className={styles.backBtn}
              onClick={() => router.back()}
            >
              ← Back
            </button>
          </div>
        </div>
      

      </section> */}
          <h1>{t("userManagement")}</h1>
  
          <div className={styles.searchTool}>
            <div className={styles.searchBox}>
              <Search className={styles.searchIcon} size={16} />
              <input
                type="text"
                placeholder={t("searchByNameOrEmail")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.search}
              />
            </div>

          <button
            className={styles.exportBtn}
            onClick={handleExportUsersPDF}
            disabled={exporting}
            >
            {exporting ? t("exporting") : t("exportPDF")}
          </button>
            </div>
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


          </div>

          {loading ? (
            <div className={styles.loading}>{t("loading")}</div>
          ) : (
            <>
              {activeTab === "verified" && (
                <div className="verifiedSection">
                  {verified.length === 0 ? (
                    <div className={styles.empty}>{t("noVerifiedUsers")}</div>
                  ) : isMobile ? (
                    filteredVerified.map((u) => (
                      <MobileUserCard
                        key={u.id}
                        user={u}
                        t={t}
                        openAccordionId={openAccordionId}
                        setOpenAccordionId={setOpenAccordionId}

                        actions={[
                          {
                            label: (
                              <span className={`${styles.menuItem} ${styles.menuItemUpdate}`}>
                                <Pen size={16} /> {t("update")}
                              </span>
                            ),
                            onClick: () => openModal(u),
                          },
                          {
                            label: (
                              <span className={`${styles.menuItem} ${styles.menuItemDanger}`}>
                                <Trash2Icon size={16} /> {t("delete")}
                              </span>

                            ),
                            onClick: () => requestDeleteUser(u),
                          },
                          {
                            label: (
                              <span className={`${styles.menuItem}`}>
                                <LucideCircleStop size={16} />{u.status === "Active" ? t("freeze") : t("unfreeze")}
                              </span>
                            ),
                            onClick: () => {
                              const action = u.status === "Active" ? "freeze" : "unfreeze";

                              setFreezeTarget({
                                user: u,
                                action
                              });
                            },
                          },
                          {
                            label: (
                              <span className={`${styles.menuItem} ${styles.menuItemDOJ}`}>
                                <DatabaseIcon size={16} /> {t("changeDOJ")}
                              </span>
                            ),
                            onClick: () => requestChangeDOJ(u),
                          },
                        ]}
                      />
                    ))
                  ) : (
                    renderTable(verified, tableColumns)
                  )}
                </div>
              )}

              {activeTab === "unverified" &&
                (unverified.length === 0 ? (
                  <div className={styles.empty}>{t("noUnverifiedUsers")}</div>
                ) : (
                  isMobile ? (
                    filteredUnverified.map((u) => (
                      <ReviewCard
                        key={u.id}
                        user={u}
                        openAccordionId={openAccordionId}
                        setOpenAccordionId={setOpenAccordionId}

                        t={t}
                        actionButton={
                          <div className={styles.cardActions}>
                            <Link
                              href={`/quickSettings/verify?email=${encodeURIComponent(u.email)}`}
                              className={styles.link}
                            >
                              <button className={`${styles.cardbtn} ${styles.button}`}>
                                {t("verify")}
                              </button>
                            </Link>
                            <button
                              className={`${styles.cardbtn} ${styles.delBtn}`}
                              onClick={() => requestDeleteUser(u)}
                            >
                              {t("delete")}
                            </button>

                          </div>
                        }
                      />
                    ))
                  ) : (

                    renderTable(unverified, limitedColumns, {
                      label: t("verify"),
                      render: (u) => (
                        <div className={styles.cardActions}>
                          <Link
                            href={`/quickSettings/verify?email=${encodeURIComponent(u.email)}`}
                            className={styles.link}
                          >
                            <button className={styles.button}>{t("verify")}</button>
                          </Link>

                          <button
                            className={`${styles.button} ${styles.btnDel}`}
                            onClick={() => requestDeleteUser(u)}
                          >
                            {t("Delete")}
                          </button>
                        </div>
                      ),
                    }))
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

                <div className={styles.modalBody} style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "0.5rem" }}>
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


          {freezeModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "24px",
                  borderRadius: "12px",
                  minWidth: "320px",
                  textAlign: "center",
                }}
              >
                <h3>{freezeModal.action === "freeze" ? t("userFrozen") : t("userUnfrozen")}</h3>
                <p style={{ marginTop: 8 }}>{freezeModal.message}</p>

                {freezeModal.user && (
                  <div style={{ textAlign: "left", marginTop: 12 }}>
                    <strong>{freezeModal.user.name}</strong>
                    <div>{t("status")}: {freezeModal.user.status}</div>
                    {freezeModal.user.freeze_date && <div>{t("freezeDate")}: {new Date(freezeModal.user.freeze_date).toISOString().slice(0, 10)}</div>}
                    {freezeModal.user.unfreeze_date && <div>{t("unfreezeDate")}: {new Date(freezeModal.user.unfreeze_date).toISOString().slice(0, 10)}</div>}
                  </div>
                )}

                <button
                  style={{
                    marginTop: "16px",
                    background: "#2563EB",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                  }}
                  onClick={() => setFreezeModal(null)}
                >
                  OK
                </button>
              </div>
            </div>
          )}


          {freezeTarget && (
            <div
              className={styles.modalOverlay}
              onClick={() => setFreezeTarget(null)}
            >
              <div
                className={styles.confirmModal}
                onClick={(e) => e.stopPropagation()}
              >
                <h3>
                  {freezeTarget.action === "freeze"
                    ? t("confirmFreeze")
                    : t("confirmUnfreeze")}
                </h3>

                <p>
                  {freezeTarget.action === "freeze"
                    ? t("confirmFreezeUser")
                    : t("confirmUnfreezeUser")}{" "}
                  <strong>{freezeTarget.user.name}</strong> ?
                </p>

                <div className={styles.modalActions}>
                  <button
                    className={`${styles.button} ${freezeTarget.action === "freeze"
                        ? styles.btnFreeze
                        : styles.btnUnfreeze
                      }`}
                    onClick={confirmFreezeUser}
                  >
                    {freezeTarget.action === "freeze"
                      ? t("freeze")
                      : t("unfreeze")}
                  </button>

                  <button
                    className={styles.buttonCancel}
                    onClick={() => setFreezeTarget(null)}
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
