import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

export default function EditStaff() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    phone: "",
    role: "",
    joining_date: "",
    salary_type: "monthly",
    base_salary: "",
    overtime_rate: "",
    late_penalty: "",
    current_balance: "",
    shift_start: "09:00",
    late_after: "09:30",
    shift_end: "18:00",
  });

  useEffect(() => {
    if (id) fetchStaff();
  }, [id]);

  async function fetchStaff() {
    try {
      setLoading(true);
      const list = await staffRequest("/api/staff/list/", { method: "GET" });
      const found = (list || []).find((row) => String(row.id) === String(id));
      if (!found) {
        toast.error("Staff not found");
        return;
      }
      setForm({
        id: found.id,
        name: found.name || "",
        phone: found.phone || "",
        role: found.role || "",
        joining_date: found.joining_date ? String(found.joining_date).split("T")[0] : "",
        salary_type: found.salary_type || "monthly",
        base_salary: found.base_salary || "",
        overtime_rate: found.overtime_rate || "",
        late_penalty: found.late_penalty || "",
        current_balance: found.current_balance || "",
        shift_start: String(found.shift_start || "09:00").slice(0, 5),
        late_after: String(found.late_after || "09:30").slice(0, 5),
        shift_end: String(found.shift_end || "18:00").slice(0, 5),
      });
    } catch (error) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    try {
      setSaving(true);
      await staffRequest("/api/staff/update/", { body: form });
      toast.success("Staff updated");
      router.push(`/staff/profile/${form.id}`);
    } catch (error) {
      toast.error("Failed to update staff");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    const confirmed = window.confirm("Deactivate this staff member?");
    if (!confirmed) return;

    try {
      await staffRequest("/api/staff/delete/", { body: { id: form.id } });
      toast.success("Staff deactivated");
      router.push("/staff/list");
    } catch (error) {
      toast.error("Failed to deactivate staff");
    }
  }

  return (
    <Layout title="Edit Staff">
      <div className={styles.container}>
        <div className={styles.pageStack}>
          <button type="button" className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={16} /> Back
          </button>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>Staff</p>
            <h1 className={styles.heroHeading}>Edit Staff Profile</h1>
            <p className={styles.heroText}>Update salary rules, time rules, and balance without leaving the staff flow.</p>
          </section>

          {loading ? (
            <div className={styles.emptyMsg}>Loading...</div>
          ) : (
            <form onSubmit={handleSave} className={styles.paymentFormCard}>
              <div className={styles.formGridCompact}>
                <div className={styles.formGroup}><label>Name</label><input className={styles.formInput} name="name" value={form.name} onChange={handleChange} required /></div>
                <div className={styles.formGroup}><label>Phone</label><input className={styles.formInput} name="phone" value={form.phone} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Role</label><input className={styles.formInput} name="role" value={form.role} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Joining Date</label><input className={styles.formInput} type="date" name="joining_date" value={form.joining_date} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Salary Type</label><select className={styles.formInput} name="salary_type" value={form.salary_type} onChange={handleChange}><option value="monthly">Monthly</option><option value="daily">Daily</option><option value="hourly">Hourly</option></select></div>
                <div className={styles.formGroup}><label>Base Salary</label><input className={styles.formInput} type="number" name="base_salary" value={form.base_salary} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Overtime Rate / Hour</label><input className={styles.formInput} type="number" name="overtime_rate" value={form.overtime_rate} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Late Penalty / Minute</label><input className={styles.formInput} type="number" name="late_penalty" value={form.late_penalty} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Current Balance</label><input className={styles.formInput} type="number" name="current_balance" value={form.current_balance} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Shift Start</label><input className={styles.formInput} type="time" name="shift_start" value={form.shift_start} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Late After</label><input className={styles.formInput} type="time" name="late_after" value={form.late_after} onChange={handleChange} /></div>
                <div className={styles.formGroup}><label>Shift End</label><input className={styles.formInput} type="time" name="shift_end" value={form.shift_end} onChange={handleChange} /></div>
              </div>

              <div className={styles.heroActions}>
                <button className={styles.btnPrimary} type="submit" disabled={saving}>
                  <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className={styles.actionBtn} onClick={handleDeactivate}>
                  <Trash2 size={18} /> Deactivate
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
