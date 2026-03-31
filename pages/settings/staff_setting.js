import { useAppRefresh } from "@/lib/useAppRefresh";
import { useEffect, useState } from "react";
import styles from "../../styles/settings.module.css";
import toast from "react-hot-toast";
import {Edit, Delete, Trash, PencilIcon } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { offlineFetch } from "../../lib/offlineFetch";

export default function StaffHandling() {
  if (typeof window !== "undefined") {
    window.location.replace("/staff/list/");
  }

  return null;

  const { t } = useLanguage();

  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editStaff, setEditStaff] = useState(null);

  // 🔹 Add staff form
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  // 🔹 Edit credentials form
  const [credForm, setCredForm] = useState({
    newEmail: "",
    newPassword: "",
  });

  /* ----------------------------------
     Load Staffs
  ---------------------------------- */
  
  
  
  const loadStaffs = async () => {
    try {
      const token = localStorage.getItem("token");

      const data = await offlineFetch("staff-list", async () => {
      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/settings/staffs/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
 return data.data || [];
    });
      setStaffs(data || []);
    } catch {
      toast.error(t("failed_to_load_staffs"));
    } finally {
      setLoading(false);
    }
  };
  
  /* ----------------------------------
     Add Staff
  ---------------------------------- */
  const addStaff = async () => {
    try {
      if (!addForm.name || !addForm.email || !addForm.password) {
        return toast.error(t("all_fields_required"));
      }

      const token = localStorage.getItem("token");

      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/settings/staffs/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addForm),
        }
      );
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast.success(t("staff_added"));
      setAddForm({ name: "", email: "", password: "" });
      setShowAddModal(false);
      loadStaffs();
    } catch (e) {
      toast.error(e.message || t("update_failed"));
    }
  };
  
  /* ----------------------------------
  Update Staff Credentials
  ---------------------------------- */
  const updateCredentials = async () => {
    try {
      if (!credForm.newPassword && !credForm.newEmail) {
        return toast.error(t("nothing_to_update"));
      }
      
      const token = localStorage.getItem("token");
      
      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/settings/staffs/${editStaff.id}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      newEmail: credForm.newEmail,
      newPassword: credForm.newPassword,
    }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(t("credentials_updated_successfully"));
      setCredForm({ newEmail: "", newPassword: "" });
      setEditStaff(null);
      loadStaffs();
    } catch (e) {
      toast.error(e.message || t("update_failed"));
    }
  };
  
  /* ----------------------------------
  Delete Staff
  ---------------------------------- */
  const handleDeleteStaff = async (staffId) => {
    if (!confirm(t("confirm_delete_staff"))) return;
    
    try {
      const token = localStorage.getItem("token");
      
      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/settings/staffs/${staffId}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast.success(t("staff_deleted"));
      loadStaffs();
    } catch (e) {
      toast.error(e.message || t("update_failed"));
    }
  };
  
  useEffect(() => {
    loadStaffs();
  }, []);
  useAppRefresh(loadStaffs);
  /* ----------------------------------
     UI
  ---------------------------------- */
  return (
    <div className={styles.staffWrapper}>
      {!loading && staffs.length === 0 && (
        <div className={styles.emptyState}>
          <p>{t("no_staff_associated")}</p>
        </div>
      )}

      <div className={styles.staffList}>
        {staffs.map((staff) => (
          <div key={staff.id} className={styles.staffCard}>
            <div>
              <strong>{staff.name}</strong>
              <small>{staff.email}</small>
            </div>

            <div className={styles.actions}>
              <button onClick={() => setEditStaff(staff)}><PencilIcon size={22}/></button>
              <button onClick={() => handleDeleteStaff(staff.id)}><Trash size={22}/></button>
            </div>
          </div>
        ))}
      </div>

      {/* 🔹 ADD STAFF MODAL */}
      {showAddModal && (
        <div
    className={styles.modalOverlay}
    onClick={() => setShowAddModal(false)}
  >
    <div
      className={styles.modal}
      onClick={(e) => e.stopPropagation()}
    >
          <button
      className={styles.closeBtn}
      onClick={() => setShowAddModal(false)}
      aria-label={t("close")}
    >
      ✕
    </button>
          <h3>{t("add_staff")}</h3>

          <label>{t("staff_name")}</label>
          <input
            value={addForm.name}
            onChange={(e) =>
              setAddForm({ ...addForm, name: e.target.value })
            }
          />

          <label>{t("email")}</label>
          <input
            value={addForm.email}
            onChange={(e) =>
              setAddForm({ ...addForm, email: e.target.value })
            }
          />

          <label>{t("password")}</label>
          <input
            type="password"
            value={addForm.password}
            onChange={(e) =>
              setAddForm({ ...addForm, password: e.target.value })
            }
          />

          <button onClick={addStaff}>{t("add_staff")}</button>
        </div>
        </div>
      )}

      {/* 🔹 EDIT CREDENTIALS MODAL */}
      {editStaff && (
        <div
    className={styles.modalOverlay}
    onClick={() => {setEditStaff(null);
  setCredForm({ newEmail: "", newPassword: "" })}}
  >
    <div
      className={styles.modal}
      onClick={(e) => e.stopPropagation()}
    >
          <button
      className={styles.closeBtn}
      onClick={() => {
        setEditStaff(null);
        setCredForm({ newEmail: "", newPassword: "" });
      }}
      aria-label={t("close")}
    >
      ✕
    </button>

          <h3>{t("edit_staff_credentials")}</h3>

          <label>{t("new_email_optional")}</label>
          <input
            value={credForm.newEmail}
            onChange={(e) =>
              setCredForm({ ...credForm, newEmail: e.target.value })
            }
          />

          <label>{t("new_password")}</label>
          <input
            type="password"
            value={credForm.newPassword}
            onChange={(e) =>
              setCredForm({ ...credForm, newPassword: e.target.value })
            }
          />

          <button onClick={updateCredentials}>
            {t("update_credentials")}
          </button>
        </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        className={styles.fab}
        onClick={() => setShowAddModal(true)}
      >
        ＋
      </button>
    </div>
  );
}
