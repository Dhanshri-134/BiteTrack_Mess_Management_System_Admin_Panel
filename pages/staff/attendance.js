import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/staff.module.css";
import toast from "react-hot-toast";
import { offlineFetch } from "@/lib/offlineFetch";
import { API_BASE } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";

export default function StaffAttendance() {

  const { t } = useLanguage();

  const [staff, setStaff] = useState([]);
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {

    const token = localStorage.getItem("token");

    try {

      const data = await offlineFetch("staff-attendance", async () => {

        const res = await fetch(
          `https://bite-track-mess-management-system-a.vercel.app/api/staff/list/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error();

        return res.json();
      });

      const now = new Date();

      const currentTime =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

      const prepared = data.map((s) => ({
        ...s,
        check_in: currentTime,
        check_out: "",
        overtime_hours: 0,
        penalty_amount: 0,
        is_late: false,
      }));

      setStaff(prepared);

    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(index, field, value) {

    const updated = [...staff];

    updated[index][field] = value;

    if (field === "check_in") {

      const lateTime = "09:30";

      if (value > lateTime) {

        updated[index].is_late = true;

        updated[index].penalty_amount =
          updated[index].late_penalty || 50;

      } else {

        updated[index].is_late = false;

        updated[index].penalty_amount = 0;
      }
    }

    if (field === "overtime_hours") {

      const rate = updated[index].overtime_rate || 0;

      updated[index].overtime_amount = value * rate;
    }

    setStaff(updated);
  }

  async function saveAttendance(row) {

    const token = localStorage.getItem("token");

    try {

      const res = await fetch(
        `https://bite-track-mess-management-system-a.vercel.app/api/staff/attendance/mark/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            staff_id: row.id,
            attendance_date: date,
            check_in: row.check_in,
            check_out: row.check_out,
            overtime_hours: row.overtime_hours,
            penalty_amount: row.penalty_amount,
          }),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Saved");

    } catch {
      toast.error("Save failed");
    }
  }

  return (
    <Layout title="Staff Attendance">

      <div className={styles.container}>

        <h2 className={styles.pageTitle}>
          {t("staffAttendance")}
        </h2>

        <div className={styles.dateRow}>
          <label>{t("date")}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {loading ? (
          <p>{t("loading")}...</p>
        ) : (

          <div className={styles.tableWrapper}>

            <table className={styles.attendanceTable}>

              <thead>

                <tr>
                  <th>{t("name")}</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Late</th>
                  <th>Overtime</th>
                  <th>Penalty</th>
                  <th>Save</th>
                </tr>

              </thead>

              <tbody>

                {staff.map((s, i) => (

                  <tr key={s.id}>

                    <td>{s.name}</td>

                    <td>
                      <input
                        type="time"
                        value={s.check_in}
                        onChange={(e) =>
                          handleChange(
                            i,
                            "check_in",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="time"
                        value={s.check_out || ""}
                        onChange={(e) =>
                          handleChange(
                            i,
                            "check_out",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      {s.is_late ? (
                        <span className={styles.late}>Late</span>
                      ) : (
                        "On Time"
                      )}
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        value={s.overtime_hours}
                        onChange={(e) =>
                          handleChange(
                            i,
                            "overtime_hours",
                            Number(e.target.value)
                          )
                        }
                      />
                    </td>

                    <td>
                      ₹{s.penalty_amount || 0}
                    </td>

                    <td>
                      <button
                        className={styles.saveBtn}
                        onClick={() => saveAttendance(s)}
                      >
                        Save
                      </button>
                    </td>

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