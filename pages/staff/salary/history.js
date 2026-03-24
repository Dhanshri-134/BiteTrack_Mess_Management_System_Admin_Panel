import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import DayDropdown from "../../../components/DayDropdown";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffOfflineRequest, staffRequest } from "@/lib/staffClient";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function SalaryHistoryPage() {
  const { t } = useLanguage();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [salary, setSalary] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }));
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map((value) => ({
    value,
    label: String(value),
  }));

  useEffect(() => {
    fetchSalary(false);
  }, [month, year]);

  async function fetchSalary(forceRefresh) {
    try {
      setLoading(true);
      const cacheKey = `staff-salary-history-${month}-${year}-v2`;
      const response = forceRefresh
        ? await staffRequest("/api/staff/salary/list/", { body: { month, year } })
        : await staffOfflineRequest(cacheKey, "/api/staff/salary/list/", {
            method: "POST",
            body: { month, year },
          });
      setSalary(response?.data || []);
    } catch (error) {
      toast.error(t("failedToLoadSalary"));
    } finally {
      setLoading(false);
    }
  }

  async function generateSalary() {
    try {
      await staffRequest("/api/staff/salary/generate/", { body: { month, year } });
      toast.success(t("salaryGenerated"));
      fetchSalary(true);
    } catch (error) {
      toast.error(t("salaryGenerationFailed"));
    }
  }

  async function markPaid(id) {
    try {
      await staffRequest("/api/staff/salary/pay/", { body: { salary_id: id } });
      toast.success(t("paymentRecorded"));
      fetchSalary(true);
    } catch (error) {
      toast.error(t("failedToRecordPayment"));
    }
  }

  const totals = useMemo(() => {
    return salary.reduce(
      (acc, row) => {
        acc.final += Number(row.final_salary || 0);
        acc.penalty += Number(row.penalty_amount || 0);
        acc.overtime += Number(row.overtime_amount || 0);
        acc.pending += String(row.payment_status || "").toLowerCase() === "paid" ? 0 : 1;
        return acc;
      },
      { final: 0, penalty: 0, overtime: 0, pending: 0 }
    );
  }, [salary]);

  return (
    <Layout title={t("staffSalaryHistory")}>
      <div className={styles.container}>
        <div className={styles.pageStack}>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>{t("salary")}</p>
            <div className={styles.header}>
               
            <h1 className={styles.heroHeading}>{t("salaryManagement")}</h1>
          <button type="button" className={styles.backBtn} onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> {t("back")}
          </button>
            </div>
            <p className={styles.heroText}>{t("salaryManagementDescription")}</p>
          </section>

          <section className={styles.insightGrid}>
            <div className={styles.insightCard}><span>{t("totalPayable")}</span><strong>{formatMoney(totals.final)}</strong></div>
            <div className={styles.insightCard}><span>{t("overtime")}</span><strong>{formatMoney(totals.overtime)}</strong></div>
            <div className={styles.insightCard}><span>{t("penalty")}</span><strong>{formatMoney(totals.penalty)}</strong></div>
            <div className={styles.insightCard}><span>{t("pendingRows")}</span><strong>{totals.pending}</strong></div>
          </section>

          <section className={styles.paymentFormCard}>
            <div className={styles.formGridCompact}>
              <div className={styles.formGroup}>
                <label>{t("month")}</label>
                <DayDropdown
                  options={monthOptions}
                  value={month}
                  onChange={(value) => setMonth(Number(value))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("year")}</label>
                <DayDropdown
                  options={yearOptions}
                  value={year}
                  onChange={(value) => setYear(Number(value))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t("generate")}</label>
                <button type="button" className={styles.primaryBtn} onClick={generateSalary}>{t("generateSalary")}</button>
              </div>
              <div className={styles.formGroup}>
                <label>{t("refresh")}</label>
                <button type="button" className={styles.refreshBtn} onClick={() => fetchSalary(true)}>
                  <RefreshCw size={16} /> {t("refreshData")}
                </button>
              </div>
            </div>
          </section>

          <section className={styles.timelineList}>
            {loading ? <div className={styles.emptyMsg}>{t("loading")}</div> : null}
            {!loading && salary.length === 0 ? <div className={styles.emptyMsg}>{t("noSalaryRecordsFound")}</div> : null}
            {!loading && salary.map((row) => (
              <div key={row.id} className={styles.timelineItem}>
                <div className={styles.tlDetails}>
                  <div className={styles.tlRow}>
                    <strong>{row.name}</strong>
                    <span className={`${styles.statusPill} ${String(row.payment_status || "").toLowerCase() === "paid" ? styles.statusP : styles.statusL}`}>
                      {row.payment_status || t("pending")}
                    </span>
                  </div>
                  <div className={styles.tlRow2}>
                    <span>{row.role || t("staff")}</span>
                    <span>{String(row.salary_type || "monthly").toUpperCase()}</span>
                  </div>
                  <div className={styles.statusLegend} style={{ marginTop: "0.65rem" }}>
                    <span className={styles.statusPill}>{t("baseAmount", { amount: formatMoney(row.base_salary) })}</span>
                    <span className={`${styles.statusPill} ${styles.statusOT}`}>{t("overtimeAmount", { amount: formatMoney(row.overtime_amount) })}</span>
                    <span className={`${styles.statusPill} ${styles.statusL}`}>{t("penaltyAmount", { amount: formatMoney(row.penalty_amount) })}</span>
                    <span className={styles.statusPill}>{t("paidAmountLabel", { amount: formatMoney(row.total_paid) })}</span>
                    <span className={styles.statusPill}>{t("netAmount", { amount: formatMoney(row.final_salary) })}</span>
                  </div>
                  {String(row.payment_status || "").toLowerCase() !== "paid" ? (
                    <div style={{ marginTop: "0.85rem" }}>
                      <button type="button" className={styles.primaryBtn} onClick={() => markPaid(row.id)}>
                        {t("markPaid")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
}
