import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import Link from "next/link";
import styles from "../../../styles/table.module.css";
import toast from "react-hot-toast";
import { offlineFetch } from "@/lib/offlineFetch";
import { API_BASE } from "../../../lib/api";
import { useLanguage } from "../../../context/LanguageContext";

export default function StaffList() {

  const { t } = useLanguage();

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {

    const token = localStorage.getItem("token");

    try {

      const data = await offlineFetch("staff-list", async () => {

        const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/staff/list/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed");

        return res.json();
      });

      setStaff(data || []);

    } catch (err) {

      toast.error("Unable to load staff");

    } finally {

      setLoading(false);

    }
  }

  async function deactivateStaff(id) {

    const confirm = window.confirm("Deactivate this staff member?");
    if (!confirm) return;

    const token = localStorage.getItem("token");

    try {

      const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/staff/delete/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error();

      toast.success("Staff deactivated");

      fetchStaff();

    } catch {

      toast.error("Failed to deactivate");

    }
  }

  const filteredStaff = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Staff List">

      <div className={styles.container}>

        <div className={styles.headerRow}>
          <h2>{t("staffList")}</h2>

          <Link href="/staff/create" className={styles.primaryBtn}>
            + {t("addStaff")}
          </Link>
        </div>

        <input
          className={styles.searchInput}
          placeholder={t("searchStaff")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p>{t("loading")}...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("role")}</th>
                <th>{t("phone")}</th>
                <th>{t("salary")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>

            <tbody>

              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan="6">{t("noData")}</td>
                </tr>
              )}

              {filteredStaff.map((s) => (

                <tr key={s.id}>

                  <td>{s.name}</td>

                  <td>{s.role}</td>

                  <td>{s.phone}</td>

                  <td>₹{s.base_salary}</td>

                  <td>
                    {s.is_active ? (
                      <span className={styles.active}>Active</span>
                    ) : (
                      <span className={styles.inactive}>Inactive</span>
                    )}
                  </td>

                  <td className={styles.actions}>

                    <Link href={`/staff/edit/${s.id}`}>
                      {t("edit")}
                    </Link>

                    {s.is_active && (
                      <button
                        onClick={() => deactivateStaff(s.id)}
                        className={styles.dangerBtn}
                      >
                        {t("deactivate")}
                      </button>
                    )}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>
        )}
      </div>
    </Layout>
  );
}