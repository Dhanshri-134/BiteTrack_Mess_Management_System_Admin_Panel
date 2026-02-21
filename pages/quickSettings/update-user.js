import { useState, useEffect } from "react";
import styles from "../../styles/updatuser.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

export default function UpdateUser() {
   const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  /* ---------------- Fetch users ---------------- */
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized");

      const data = await offlineFetch("users-list", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/users/list/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      });

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ---------------- Live filter ---------------- */
  const filteredUsers = searchTerm
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.phone?.includes(searchTerm)
      )
    : [];

  /* ---------------- Select user ---------------- */
  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      phone: u.phone || "",
      room_no: u.room_no || "",
      hostel_name: u.hostel_name || "",
      course: u.course || "",
      parent_name: u.parents?.[0]?.name || "",
      parent_contact: u.parents?.[0]?.contact || "",
      parent_address: u.parents?.[0]?.address || "",
    });
  };

  /* ---------------- Form change ---------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ---------------- Update ---------------- */
  // const handleUpdate = async () => {
  //   if (!selectedUser) return;
  //   setUpdating(true);

  //   try {
  //     const resUser = await fetch("/api/users/update", {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ id: selectedUser.id, ...form }),
  //     });

  //     const userData = await resUser.json();
  //     if (!resUser.ok)
  //       return toast.error(userData.error || "Failed to update user");

  //     const resParent = await fetch("/api/parents/update", {
  //       method: "PUT",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         user_id: selectedUser.id,
  //         name: form.parent_name,
  //         contact: form.parent_contact,
  //         address: form.parent_address,
  //       }),
  //     });

  //     const parentData = await resParent.json();
  //     if (!resParent.ok)
  //       return toast.error(parentData.error || "Failed to update parent");

  //     toast.success("User updated successfully!");
  //     setSelectedUser(null);
  //     setForm({});
  //     setSearchTerm("");
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Something went wrong. Please try again.");
  //   } finally {
  //     setUpdating(false);
  //   }
  // };
 const handleUpdate = async () => {
  if (!selectedUser) return;

  setUpdating(true);

  try {
    // 🔹 Update user
    const res = await fetch(
      "https://bite-track-mess-management-system-a.vercel.app/api/update/",
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          id: selectedUser.id, // ✅ REQUIRED
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          room_no: form.room_no,
          hostel_name: form.hostel_name,
          course: form.course,
           parent_name: form.parent_name,
  parent_contact: form.parent_contact,
  parent_address: form.parent_address,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.message || t("somethingWentWrong"));
      return;
    }

    // 🔹 Update parent
    // await fetch(
    //   "https://bite-track-mess-management-system-a.vercel.app/api/parents/update/",
    //   {
    //     method: "PUT",
    //     headers: authHeaders(),
    //     body: JSON.stringify({
    //       user_id: selectedUser.id, // ✅ FIXED
    //       name: form.parent_name,
    //       contact: form.parent_contact,
    //       address: form.parent_address,
    //     }),
    //   }
    // );

    toast.success(t("updatedSuccessfully"));

    // 🔹 Refresh list (cache + UI)
    fetchData();

    // 🔹 Reset UI
    setSelectedUser(null);
    setForm({});
    setSearchTerm("");
  } catch (err) {
    console.error(err);
    toast.error(t("somethingWentWrong"));
  } finally {
    setUpdating(false);
  }
};


  const authHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};
  /* ---------------- UI ---------------- */
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1>Update User</h1>

        {/* Search */}
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search by Name, Email, or Mobile"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Results */}
        {searchTerm && filteredUsers.length > 0 && (
          <ul className={styles.userList}>
            {filteredUsers.map((u) => (
              <li
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className={
                  selectedUser?.id === u.id ? styles.selectedUser : ""
                }
              >
                {u.name || `${u.first_name} ${u.last_name}`} (
                {u.email || u.phone})
              </li>
            ))}
          </ul>
        )}
 {selectedUser && (
          <div className={styles.formWrapper}>
              <h2>{t("updateUser")}</h2>

              <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "0.5rem" }}>
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
{/* 
                <label>
                  Mobile:
                  <input name="mobile" value={form.mobile} onChange={handleChange} />
                </label> */}

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

              <button
              className={styles.saveButton}
              onClick={handleUpdate}
              disabled={updating}
            >
              {updating ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
        
      </main>
    </div>
  );
}
