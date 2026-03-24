import { useEffect, useMemo, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffOfflineRequest, staffRequest } from "@/lib/staffClient";
import { ArrowLeft, CalendarDays, CheckCircle, Clock3, UserRound } from "lucide-react";

const ATTENDANCE_OPTIONS = [
  { label: "P", value: "P", help: "Present" },
  { label: "HF", value: "H", help: "Half Day" },
  { label: "A", value: "A", help: "Absent" },
  { label: "L", value: "L", help: "Leave" },
  { label: "OFF", value: "OFF", help: "Off" },
];

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function StaffAttendance() {
  const [staff, setStaff] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    try {
      setLoading(true);
      const data = await staffOfflineRequest("staff-attendance-staff-v3", "/api/staff/list/", {
        method: "GET",
      });

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setStaff(
        (data || []).map((row) => ({
          ...row,
          check_in: currentTime,
          check_out: String(row.shift_end || "18:00").slice(0, 5),
          attendance_type: "P",
          overtime_hours: 0,
          overtime_amount: 0,
          late_minutes: 0,
          penalty_amount: 0,
          is_late: false,
          notes: "",
        }))
      );
    } catch (error) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    if (selectedIndex === null) return;
    const updated = [...staff];
    const current = { ...updated[selectedIndex], [field]: value };

    if (field === "check_in") {
      const lateTime = String(current.late_after || "09:30").slice(0, 5);
      if (value && value > lateTime) {
        const [h1, m1] = value.split(":").map(Number);
        const [h2, m2] = lateTime.split(":").map(Number);
        current.is_late = true;
        current.late_minutes = Math.max(0, h1 * 60 + m1 - (h2 * 60 + m2));
        current.penalty_amount = current.late_minutes * Number(current.late_penalty || 0);
        if (current.late_minutes > 120 && current.attendance_type === "P") {
          current.attendance_type = "H";
        }
      } else {
        current.is_late = false;
        current.late_minutes = 0;
        current.penalty_amount = 0;
      }
    }

    if (field === "check_out") {
      const shiftEnd = String(current.shift_end || "18:00").slice(0, 5);
      if (value && value > shiftEnd) {
        const [h1, m1] = value.split(":").map(Number);
        const [h2, m2] = shiftEnd.split(":").map(Number);
        const diffMinutes = Math.max(0, h1 * 60 + m1 - (h2 * 60 + m2));
        current.overtime_hours = Number((diffMinutes / 60).toFixed(2));
        current.overtime_amount = current.overtime_hours * Number(current.overtime_rate || 0);
      } else {
        current.overtime_hours = 0;
        current.overtime_amount = 0;
      }
    }

    if (field === "attendance_type" && (value === "A" || value === "L" || value === "OFF")) {
      current.is_late = false;
      current.late_minutes = 0;
      current.penalty_amount = 0;
      current.overtime_hours = 0;
      current.overtime_amount = 0;
    }

    updated[selectedIndex] = current;
    setStaff(updated);
  }

  async function saveAttendance() {
    if (selectedIndex === null) return;
    const row = staff[selectedIndex];

    try {
      await staffRequest("/api/staff/attendance/mark/", {
        body: {
          staff_id: row.id,
          attendance_date: date,
          check_in: row.check_in,
          check_out: row.check_out,
          attendance_type: row.attendance_type,
          notes: row.notes,
        },
      });
      toast.success("Attendance saved");
      setSelectedIndex(null);
    } catch (error) {
      toast.error("Failed to save attendance");
    }
  }

  const selected = selectedIndex === null ? null : staff[selectedIndex];

  const summary = useMemo(() => {
    return {
      total: staff.length,
      lateRules: staff.filter((row) => Number(row.late_penalty || 0) > 0).length,
      overtimeRules: staff.filter((row) => Number(row.overtime_rate || 0) > 0).length,
    };
  }, [staff]);

  return (
    <Layout title="Staff Attendance">
      <div className={styles.container}>
        <div className={styles.pageStack}>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>Attendance</p>
             <div className={styles.header}>
                <h1 className={styles.heroHeading}>Mark Attendance</h1>
              <button type="button" className={styles.backBtn} onClick={() => window.history.back()}>
                <ArrowLeft size={16} /> Back
              </button>
          </div>
            <p className={styles.heroText}>
              Overtime is calculated from late check-out, not from a separate status.
            </p>
            <br></br>
            <div className={styles.statusLegend}>
              {ATTENDANCE_OPTIONS.map((option) => (
                <span key={option.value} className={`${styles.statusPill} ${styles[`status${option.label}`] || styles.statusOFF}`}>
                  {option.label} : {option.help}
                </span>
              ))}
              <span className={`${styles.statusPill} ${styles.statusL}`}>Late</span>
              <span className={`${styles.statusPill} ${styles.statusOT}`}>OT Overtime</span>
            </div>
          </section>

          <section>
            {/* <div className={styles.insightCard}><span>Staff Cards</span><strong>{summary.total}</strong></div>
            <div className={styles.insightCard}><span>Late Rules</span><strong>{summary.lateRules}</strong></div>
            <div className={styles.insightCard}><span>OT Rules</span><strong>{summary.overtimeRules}</strong></div> */}
            <div className={styles.surfaceCard}>
              <label style={{ display: "flex", fontWeight: 700, marginBottom: "0.5rem", color: "#334155" }}>Attendance Date</label>
              <input className={styles.formInput} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </section>

          <section className={styles.cardList}>
            {loading ? <div className={styles.emptyMsg}>Loading...</div> : null}
            {!loading && staff.map((row, index) => (
              <button type="button" key={row.id} className={styles.staffCard} onClick={() => setSelectedIndex(index)}>
                <div className={styles.staffCardHeader}>
                  <div>
                    <h3 className={styles.staffName}>{row.name}</h3>
                    <p className={styles.staffPhone}><UserRound size={14} /> {row.phone || "No phone"}</p>
                  </div>
                  <div className={styles.staffRoleBadge}>{row.role || "Staff"}</div>
                </div>
                <div className={styles.staffCardStatsRow}>
                  <span className={`${styles.statusPill} ${styles[`status${row.attendance_type === "H" ? "HF" : row.attendance_type}`] || styles.statusOFF}`}>
                    {row.attendance_type === "H" ? "HF" : row.attendance_type}
                  </span>
                  <span className={styles.statPill}>Shift {String(row.shift_start || "09:00").slice(0, 5)} - {String(row.shift_end || "18:00").slice(0, 5)}</span>
                </div>
                <div className={styles.staffCardBalance}>
                  <span className={styles.balanceLabel}>Late After {String(row.late_after || "09:30").slice(0, 5)}</span>
                  <span className={styles.balanceAmount}>{formatMoney(row.overtime_rate)}/hr</span>
                </div>
              </button>
            ))}
          </section>

          {selected ? (
            <div className={styles.modalOverlay} onClick={() => setSelectedIndex(null)}>
              <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>{selected.name}</h2>
                  <button type="button" className={styles.iconAction} onClick={() => setSelectedIndex(null)}>X</button>
                </div>

                {selected.is_late ? (
                  <div className={styles.previewAlert}>
                    <Clock3 size={16} /> Late by {selected.late_minutes} mins. Penalty {formatMoney(selected.penalty_amount)}.
                  </div>
                ) : null}

                {Number(selected.overtime_amount || 0) > 0 ? (
                  <div className={styles.previewOT}>
                    <CheckCircle size={16} /> Overtime {selected.overtime_hours} hrs. OT Pay {formatMoney(selected.overtime_amount)}.
                  </div>
                ) : null}

                <div className={styles.formGroup}>
                  <label>Status</label>
                  <div className={styles.btnTypes}>
                    {ATTENDANCE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.typeBtn} ${selected.attendance_type === option.value ? styles.active : ""}`}
                        onClick={() => updateField("attendance_type", option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGridCompact}>
                  <div className={styles.formGroup}>
                    <label>Check In</label>
                    <input className={styles.formInput} type="time" value={selected.check_in} onChange={(event) => updateField("check_in", event.target.value)} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Check Out</label>
                    <input className={styles.formInput} type="time" value={selected.check_out || ""} onChange={(event) => updateField("check_out", event.target.value)} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.formGroupWide}`}>
                    <label>Notes</label>
                    <input className={styles.formInput} type="text" value={selected.notes || ""} placeholder="Optional note" onChange={(event) => updateField("notes", event.target.value)} />
                  </div>
                </div>

                <button className={styles.btnPrimary} type="button" onClick={saveAttendance}>
                  Save Attendance
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}
