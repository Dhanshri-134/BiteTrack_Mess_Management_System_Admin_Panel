import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/staff.module.css";
import toast from "react-hot-toast";
import { offlineFetch } from "@/lib/offlineFetch";
import { API_BASE } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";

export default function AttendanceHistory() {

  const { t } = useLanguage();

  const [staffList, setStaffList] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [filters, setFilters] = useState({
    staff_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [filters]);

  async function fetchStaff() {

    const token = localStorage.getItem("token");

    try {

      const data = await offlineFetch("staff-list", async () => {

        const res = await fetch(
          `https://bite-track-mess-management-system-a.vercel.app/api/staff/list/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error();

        return res.json();
      });

      setStaffList(data || []);

    } catch {

      toast.error("Failed to load staff");

    }
  }

  async function fetchAttendance() {

    const token = localStorage.getItem("token");

    try {

      setLoading(true);

      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/staff/attendance/history/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(filters),
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();

      setAttendance(data || []);

    } catch {

      toast.error("Failed to load attendance");

    } finally {

      setLoading(false);

    }
  }

  function handleChange(field, value) {

    setFilters({
      ...filters,
      [field]: value,
    });
  }

  return (
    <Layout title="Attendance History">

      <div className={styles.container}>

        <h2 className={styles.pageTitle}>
          {t("attendanceHistory")}
        </h2>

        {/* FILTERS */}

        <div className={styles.filterRow}>

          <select
            value={filters.staff_id}
            onChange={(e) =>
              handleChange("staff_id", e.target.value)
            }
          >
            <option value="">All Staff</option>

            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={filters.month}
            onChange={(e) =>
              handleChange("month", e.target.value)
            }
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={(e) =>
              handleChange("year", e.target.value)
            }
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>

        </div>


        {/* TABLE */}

        {loading ? (
          <p>{t("loading")}...</p>
        ) : (

          <div className={styles.tableWrapper}>

            <table className={styles.attendanceTable}>

              <thead>
                <tr>
                  <th>Date</th>
                  <th>{t("name")}</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Late</th>
                  <th>Overtime</th>
                  <th>Penalty</th>
                </tr>
              </thead>

              <tbody>

                {attendance.length === 0 && (
                  <tr>
                    <td colSpan="7">No records</td>
                  </tr>
                )}

                {attendance.map((a) => (

                  <tr key={a.id}>

                    <td>{a.attendance_date}</td>

                    <td>{a.name}</td>

                    <td>{a.check_in}</td>

                    <td>{a.check_out}</td>

                    <td>
                      {a.is_late ? (
                        <span className={styles.late}>
                          Late
                        </span>
                      ) : (
                        "No"
                      )}
                    </td>

                    <td>{a.overtime_hours}</td>

                    <td>₹{a.penalty_amount}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </Layout>
  );
}