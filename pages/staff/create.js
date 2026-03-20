import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import styles from "../../styles/staff.module.css";
import toast from "react-hot-toast";
import { API_BASE } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";

export default function CreateStaff() {

  const router = useRouter();
  const { t } = useLanguage();

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
  });

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {

    e.preventDefault();

    if (!form.name) {
      toast.error("Name required");
      return;
    }

    const token = localStorage.getItem("token");

    try {

      setLoading(true);

      const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/staff/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast.success("Staff created");

      router.push("/staff/list");

    } catch (err) {

      toast.error("Failed to create staff");

    } finally {

      setLoading(false);

    }
  }

  return (
    <Layout title="Create Staff">

      <div className={styles.container}>

        <h2>{t("addStaff")}</h2>

        <form onSubmit={handleSubmit} className={styles.form}>

          <div className={styles.formGroup}>
            <label>{t("name")}</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("phone")}</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("role")}</label>
            <input
              name="role"
              value={form.role}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("joiningDate")}</label>
            <input
              type="date"
              name="joining_date"
              value={form.joining_date}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("salaryType")}</label>
            <select
              name="salary_type"
              value={form.salary_type}
              onChange={handleChange}
            >
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>{t("baseSalary")}</label>
            <input
              type="number"
              name="base_salary"
              value={form.base_salary}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("overtimeRate")} (₹ / hr)</label>
            <input
              type="number"
              name="overtime_rate"
              value={form.overtime_rate}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("latePenalty")} (₹)</label>
            <input
              type="number"
              name="late_penalty"
              value={form.late_penalty}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={loading}
          >
            {loading ? t("saving") : t("save")}
          </button>

        </form>

      </div>
    </Layout>
  );
}