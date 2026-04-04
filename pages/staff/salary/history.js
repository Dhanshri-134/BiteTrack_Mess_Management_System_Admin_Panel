import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import DayDropdown from "../../../components/DayDropdown";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffOfflineRequest, staffRequest } from "@/lib/staffClient";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function getStatusClass(status, stylesRef) {
  if (status === "paid") return stylesRef.statusP;
  if (status === "partial") return stylesRef.statusOT;
  if (status === "not_added") return stylesRef.statusOFF;
  return stylesRef.statusL;
}

export default function SalaryHistoryPage() {
  const { t } = useLanguage();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [salary, setSalary] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
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

  function buildDraftState(rows) {
    return rows.reduce((acc, row) => {
      acc[String(row.staff_id)] = {
        base_salary: String(row.id ? row.base_salary : row.configured_base_salary || 0),
        overtime_amount: String(row.default_overtime_amount || 0),
penalty_amount: String(row.default_penalty_amount || 0),
      };
      return acc;
    }, {});
  }

  async function fetchSalary(forceRefresh) {
    try {
      setLoading(true);
      const cacheKey = `staff-salary-history-${month}-${year}-manual-v3`;
      const response = forceRefresh
        ? await staffRequest("/api/staff/salary/list/", { body: { month, year } })
        : await staffOfflineRequest(cacheKey, "/api/staff/salary/list/", {
            method: "POST",
            body: { month, year },
          });
      const rows = response?.data || [];
      setSalary(rows);
      setDrafts(buildDraftState(rows));
    } catch (error) {
      toast.error(t("failedToLoadSalary"));
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(staffId, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [String(staffId)]: {
        ...prev[String(staffId)],
        [field]: value,
      },
    }));
  }

  async function saveSalary(staffId) {
    const draft = drafts[String(staffId)];
    if (!draft) return;

    try {
      setSavingId(`save-${staffId}`);
      await staffRequest("/api/staff/salary/save/", {
        body: {
          staff_id: staffId,
          month,
          year,
          base_salary: Number(draft.base_salary || 0),
          overtime_amount: Number(draft.overtime_amount || 0),
          penalty_amount: Number(draft.penalty_amount || 0),
        },
      });
      toast.success("Salary saved");
      await fetchSalary(true);
    } catch (error) {
      toast.error("Failed to save salary");
    } finally {
      setSavingId(null);
    }
  }

  async function markPaid(id) {
    try {
      setSavingId(`pay-${id}`);
      await staffRequest("/api/staff/salary/pay/", { body: { salary_id: id } });
      toast.success(t("paymentRecorded"));
      await fetchSalary(true);
    } catch (error) {
      toast.error(t("failedToRecordPayment"));
    } finally {
      setSavingId(null);
    }
  }

  const totals = useMemo(() => {
    return salary.reduce(
      (acc, row) => {
        acc.final += Number(row.final_salary || 0);
        acc.penalty += Number(row.penalty_amount || 0);
        acc.overtime += Number(row.overtime_amount || 0);
        acc.pending += Number(row.final_salary || 0) > 0 ? 1 : 0;
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
            <div className={styles.header}>
              <p className={styles.heroKicker}>{t("salary")}</p>
              <button type="button" className={styles.backBtn} onClick={() => window.history.back()}>
                <ArrowLeft size={16} /> {t("back")}
              </button>
            </div>
            <h1 className={styles.heroHeading}>{t("salaryManagement")}</h1>
            {/* <p className={styles.heroText}>{t("Salary is now manual. Add or update monthly salary values for each staff member, then record payments against that saved amount.")}</p> */}
          </section>

          <section className={styles.insightGrid}>
            <div className={styles.insightCard}><span>{t("totalPayable")}</span><strong>{formatMoney(totals.final)}</strong></div>
            <div className={styles.insightCard}><span>{t("overtime")}</span><strong>{formatMoney(totals.overtime)}</strong></div>
            <div className={styles.insightCard}><span>{t("penalty")}</span><strong>{formatMoney(totals.penalty)}</strong></div>
            <div className={styles.insightCard}><span>{t("unpaidSalaries")}</span><strong>{totals.pending}</strong></div>
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
            {!loading && salary.map((row) => {
              const draft = drafts[String(row.staff_id)] || {
  base_salary: String(row.configured_base_salary || 0),
  overtime_amount: String(row.default_overtime_amount || 0),
  penalty_amount: String(row.default_penalty_amount || 0),
};

              return (
                <div key={row.staff_id} className={styles.timelineItem}>
                  <div className={styles.tlDetails}>
                    <div className={styles.tlRow}>
                      <strong onClick={() => (window.location.href = `/staff/profile/${row.staff_id}`)}>{row.name}</strong>
                      <span className={`${styles.statusPill} ${getStatusClass(String(row.payment_status || "").toLowerCase(), styles)}`}>
                        {row.payment_status === "not_added" ? t("not added") : row.payment_status || t("pending")}
                      </span>
                    </div>
                    <div className={styles.tlRow2}>
                      <span>{row.role || t("staff")}</span>
                      <span>{String(row.salary_type || "monthly").toUpperCase()}</span>
                    </div>
                    {/* <p className={styles.summaryHint} style={{ marginTop: "0.6rem" }}>
                      {t("Profile base: {{amount}}. Saved monthly salary can be different and is fully owner-controlled.", {
                        amount: formatMoney(row.configured_base_salary),
                      })}
                    </p> */}
                    {/* <div className={styles.statusLegend} style={{ marginTop: "0.65rem" }}>
                      <span className={styles.statusPill}>{t("Auto OT")}: {formatMoney(row.default_overtime_amount)}</span>
                      <span className={styles.statusPill}>{t("Auto Penalty")}: {formatMoney(row.default_penalty_amount)}</span>
                    </div> */}

                    <div className={styles.formGridCompact} style={{ marginTop: "0.9rem" }}>
                      <div className={styles.formGroup}>
                        <label>{t("Base Salary")}</label>
                        <input
                          className={styles.formInput}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.base_salary}
                          onChange={(event) => updateDraft(row.staff_id, "base_salary", event.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>{t("overtime")}</label>
                        <input
                          className={styles.formInput}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.overtime_amount}
                          onChange={(event) => updateDraft(row.staff_id, "overtime_amount", event.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>{t("penalty")}</label>
                        <input
                          className={styles.formInput}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.penalty_amount}
                          onChange={(event) => updateDraft(row.staff_id, "penalty_amount", event.target.value)}
                        />
                      </div>
                    </div>

                    <div className={styles.statusLegend}>
                      <span className={styles.statusPill} style={{ background: "#fef3c7", color: "#b45309" }}>{t("base")} {formatMoney(row.configured_base_salary)}</span>
                      <span className={styles.statusPill} style={{ background: "#fef3c7", color: "#b45309" }}>{t("Gross")}: {formatMoney(row.gross_salary)}</span>
                      <span className={styles.statusPill} style={{ background: "#ffedd5", color: "#c2410c" }}>{t("Paid")}: {formatMoney(row.total_paid)}</span>
                      <span className={styles.statusPill} style={{ background: "#dcfce7", color: "#166534" }}>{t("Net")}: {formatMoney(row.final_salary)}</span>
                    </div>

                    <div className={styles.header}>
                      <button
                        type="button"
                        className={styles.addstaff}
                        onClick={() => saveSalary(row.staff_id)}
                        disabled={savingId === `save-${row.staff_id}`}
                      >
                        <Save size={16} /> {savingId === `save-${row.staff_id}` ? t("Saving...") : row.id ? t("Update Salary") : t("Add Salary")}
                      </button>
                      {row.id ? (
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => markPaid(row.id)}
                          disabled={savingId === `pay-${row.id}` || Number(row.final_salary || 0) <= 0}
                        >
                          {savingId === `pay-${row.id}` ? t("Saving...") : t("markPaid")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </Layout>
  );
}
