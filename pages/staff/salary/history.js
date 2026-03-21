import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffOfflineRequest, staffRequest } from "@/lib/staffClient";
import { ArrowLeft, RefreshCw } from "lucide-react";

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function SalaryHistoryPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [salary, setSalary] = useState([]);
  const [loading, setLoading] = useState(false);

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
      toast.error("Failed to load salary");
    } finally {
      setLoading(false);
    }
  }

  async function generateSalary() {
    try {
      await staffRequest("/api/staff/salary/generate/", { body: { month, year } });
      toast.success("Salary generated");
      fetchSalary(true);
    } catch (error) {
      toast.error("Salary generation failed");
    }
  }

  async function markPaid(id) {
    try {
      await staffRequest("/api/staff/salary/pay/", { body: { salary_id: id } });
      toast.success("Payment recorded");
      fetchSalary(true);
    } catch (error) {
      toast.error("Failed to record payment");
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
    <Layout title="Staff Salary History">
      <div className={styles.container}>
        <div className={styles.pageStack}>

          <section className={styles.heroPanel}>
            <p className={styles.heroKicker}>Salary</p>
            <div className={styles.header}>
               
            <h1 className={styles.heroHeading}>Salary Management</h1>
          <button type="button" className={styles.backBtn} onClick={() => window.history.back()}>
            <ArrowLeft size={16} /> Back
          </button>
            </div>
            <p className={styles.heroText}>Generate salary, review deductions and overtime, and mark final payments from one page.</p>
          </section>

          <section className={styles.insightGrid}>
            <div className={styles.insightCard}><span>Total Payable</span><strong>{formatMoney(totals.final)}</strong></div>
            <div className={styles.insightCard}><span>Overtime</span><strong>{formatMoney(totals.overtime)}</strong></div>
            <div className={styles.insightCard}><span>Penalty</span><strong>{formatMoney(totals.penalty)}</strong></div>
            <div className={styles.insightCard}><span>Pending Rows</span><strong>{totals.pending}</strong></div>
          </section>

          <section className={styles.paymentFormCard}>
            <div className={styles.formGridCompact}>
              <div className={styles.formGroup}>
                <label>Month</label>
                <select className={styles.formInput} value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Year</label>
                <select className={styles.formInput} value={year} onChange={(event) => setYear(Number(event.target.value))}>
                  {[2025, 2026, 2027].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Generate</label>
                <button type="button" className={styles.primaryBtn} onClick={generateSalary}>Generate Salary</button>
              </div>
              <div className={styles.formGroup}>
                <label>Refresh</label>
                <button type="button" className={styles.refreshBtn} onClick={() => fetchSalary(true)}>
                  <RefreshCw size={16} /> Refresh Data
                </button>
              </div>
            </div>
          </section>

          <section className={styles.timelineList}>
            {loading ? <div className={styles.emptyMsg}>Loading...</div> : null}
            {!loading && salary.length === 0 ? <div className={styles.emptyMsg}>No salary records found.</div> : null}
            {!loading && salary.map((row) => (
              <div key={row.id} className={styles.timelineItem}>
                <div className={styles.tlDetails}>
                  <div className={styles.tlRow}>
                    <strong>{row.name}</strong>
                    <span className={`${styles.statusPill} ${String(row.payment_status || "").toLowerCase() === "paid" ? styles.statusP : styles.statusL}`}>
                      {row.payment_status || "pending"}
                    </span>
                  </div>
                  <div className={styles.tlRow2}>
                    <span>{row.role || "Staff"}</span>
                    <span>{String(row.salary_type || "monthly").toUpperCase()}</span>
                  </div>
                  <div className={styles.statusLegend} style={{ marginTop: "0.65rem" }}>
                    <span className={styles.statusPill}>Base {formatMoney(row.base_salary)}</span>
                    <span className={`${styles.statusPill} ${styles.statusOT}`}>OT {formatMoney(row.overtime_amount)}</span>
                    <span className={`${styles.statusPill} ${styles.statusL}`}>Penalty {formatMoney(row.penalty_amount)}</span>
                    <span className={styles.statusPill}>Paid {formatMoney(row.total_paid)}</span>
                    <span className={styles.statusPill}>Net {formatMoney(row.final_salary)}</span>
                  </div>
                  {String(row.payment_status || "").toLowerCase() !== "paid" ? (
                    <div style={{ marginTop: "0.85rem" }}>
                      <button type="button" className={styles.primaryBtn} onClick={() => markPaid(row.id)}>
                        Mark Paid
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
