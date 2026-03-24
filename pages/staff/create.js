import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import DayDropdown from "../../components/DayDropdown";
import styles from "../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";
import { ArrowLeft, Save } from "lucide-react";
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
    current_balance: "",
    shift_start: "09:00",
    late_after: "09:30",
    shift_end: "18:00",
  });
  const salaryTypeOptions = [
    { value: "monthly", label: t("monthly") },
    { value: "daily", label: t("daily") },
    { value: "hourly", label: t("hourly") },
  ];

  function handleChange(event) {
    const { name, value } = event?.target || {};
    if (!name) return;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }

    try {
      setLoading(true);
      await staffRequest("/api/staff/create/", { body: form });
      toast.success(t("staffCreated"));
      router.push("/staff/list");
    } catch (error) {
      toast.error(t("failedToCreateStaff"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title={t("createStaff")}>
      <div className={styles.container}>
        <div className={styles.pageStack}>
          <button type="button" className={styles.backBtn} onClick={() => router.back()}>
            <ArrowLeft size={16} /> {t("back")}
          </button>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>{t("staff")}</p>
            <h1 className={styles.heroHeading}>{t("addStaffMember")}</h1>
            <p className={styles.heroText}>
              {t("addStaffMemberDescription")}
            </p>
          </section>

          <form onSubmit={handleSubmit} className={styles.paymentFormCard}>
            <div className={styles.formGridCompact}>
              <div className={styles.formGroup}>
                <label>{t("name")}</label>
                <input className={styles.formInput} name="name" autoComplete="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>{t("phone")}</label>
                <input className={styles.formInput} name="phone" autoComplete="tel" value={form.phone} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("role")}</label>
                <input className={styles.formInput} name="role" autoComplete="organization-title" value={form.role} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("joiningDate")}</label>
                <input className={styles.formInput} type="date" name="joining_date" autoComplete="on" value={form.joining_date} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("salaryType")}</label>
                <DayDropdown
                  options={salaryTypeOptions}
                  value={form.salary_type}
                  onChange={(value) => setForm((prev) => ({ ...prev, salary_type: value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("baseSalary")}</label>
                <input className={styles.formInput} type="number" min="0" step="0.01" name="base_salary" autoComplete="on" value={form.base_salary} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("overtimeRatePerHour")}</label>
                <input className={styles.formInput} type="number" min="0" step="0.01" name="overtime_rate" autoComplete="on" value={form.overtime_rate} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("latePenaltyPerMinute")}</label>
                <input className={styles.formInput} type="number" min="0" step="0.01" name="late_penalty" autoComplete="on" value={form.late_penalty} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("currentBalance")}</label>
                <input className={styles.formInput} type="number" step="0.01" name="current_balance" autoComplete="on" value={form.current_balance} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("shiftStart")}</label>
                <input className={styles.formInput} type="time" name="shift_start" autoComplete="on" value={form.shift_start} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("lateAfter")}</label>
                <input className={styles.formInput} type="time" name="late_after" autoComplete="on" value={form.late_after} onChange={handleChange} />
              </div>
              <div className={styles.formGroup}>
                <label>{t("shiftEnd")}</label>
                <input className={styles.formInput} type="time" name="shift_end" autoComplete="on" value={form.shift_end} onChange={handleChange} />
              </div>
            </div>

            <button className={styles.btnPrimary} type="submit" disabled={loading}>
              <Save size={18} /> {loading ? t("saving") : t("saveStaff")}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
