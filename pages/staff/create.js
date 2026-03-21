import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import styles from "../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";
import { ArrowLeft, Save } from "lucide-react";

export default function CreateStaff() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
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

  function handleChange(event) {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setLoading(true);
      await staffRequest("/api/staff/create/", { body: form });
      toast.success("Staff created");
      router.push("/staff/list");
    } catch (error) {
      toast.error("Failed to create staff");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Create Staff">
      <div className={styles.container}>
        <div className={styles.pageStack}>
          <button type="button" className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={16} /> Back
          </button>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>Staff</p>
            <h1 className={styles.heroHeading}>Add Staff Member</h1>
            <p className={styles.heroText}>
              Add salary, time rules, current balance, and late or overtime settings in one clean form.
            </p>
          </section>

          <form onSubmit={handleSubmit} className={styles.paymentFormCard}>
            <div className={styles.formGridCompact}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input className={styles.formInput} name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Phone</label>
                <input className={styles.formInput} name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Role</label>
                <input className={styles.formInput} name="role" value={form.role} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Joining Date</label>
                <input className={styles.formInput} type="date" name="joining_date" value={form.joining_date} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Salary Type</label>
                <select className={styles.formInput} name="salary_type" value={form.salary_type} onChange={handleChange}>
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Base Salary</label>
                <input className={styles.formInput} type="number" min="0" step="0.01" name="base_salary" value={form.base_salary} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Overtime Rate / Hour</label>
                <input className={styles.formInput} type="number" min="0" step="0.01" name="overtime_rate" value={form.overtime_rate} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Late Penalty / Minute</label>
                <input className={styles.formInput} type="number" min="0" step="0.01" name="late_penalty" value={form.late_penalty} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Current Balance</label>
                <input className={styles.formInput} type="number" step="0.01" name="current_balance" value={form.current_balance} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Shift Start</label>
                <input className={styles.formInput} type="time" name="shift_start" value={form.shift_start} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Late After</label>
                <input className={styles.formInput} type="time" name="late_after" value={form.late_after} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Shift End</label>
                <input className={styles.formInput} type="time" name="shift_end" value={form.shift_end} onChange={handleChange} />
              </div>
            </div>

            <button className={styles.btnPrimary} type="submit" disabled={loading}>
              <Save size={18} /> {loading ? "Saving..." : "Save Staff"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
