import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staff.module.css";
import mStyles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";

export default function SalaryPage() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [salary, setSalary] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSalary();
    }, [month, year]);

    async function fetchSalary() {
        try {
            setLoading(true);
            const data = await staffRequest("/api/staff/salary/list/", {
                body: { month, year }
            });
            setSalary(data?.data || []);
        } catch {
            toast.error("Failed to load salary");
        } finally {
            setLoading(false);
        }
    }

    async function generateSalary() {
        try {
            setLoading(true);
            await staffRequest("/api/staff/salary/generate/", {
                body: { month, year }
            });
            toast.success("Salary generated");
            fetchSalary();
        } catch {
            toast.error("Generation failed");
            setLoading(false);
        }
    }

    async function markPaid(id) {
        try {
            await staffRequest("/api/staff/salary/pay/", {
                body: { salary_id: id }
            });
            toast.success("Marked Paid");
            fetchSalary();
        } catch {
            toast.error("Failed");
        }
    }

    return (
        <Layout title="Salary Report">
            <div className={styles.container}>
                <section className={styles.heroSection}>
                    <div>
                        <h1 className={styles.heroTitle}>Payroll Report</h1>
                        <p className={styles.heroSubtitle}>
                            View attendance summary, deductions, advances, and net payable.
                        </p>
                    </div>
                </section>

                <div className={styles.filterRow} style={{ marginBottom: "20px" }}>
                    <select
                        style={{ padding: "8px", borderRadius: "8px" }}
                        value={month}
                        onChange={e => setMonth(Number(e.target.value))}
                    >
                        {[...Array(12)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>

                    <select
                        style={{ padding: "8px", borderRadius: "8px", marginLeft: "10px" }}
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <button className={styles.generateBtn} onClick={generateSalary} disabled={loading}>
                        {loading ? "Processing..." : "Generate Payroll"}
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {salary.length === 0 && !loading && <p>No records found for this month.</p>}
                    {salary.map(s => (
                        <div key={s.id} className={mStyles.attendanceCard} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: "16px" }}>
                                <div>
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#111827" }}>{s.name}</h3>
                                    <span style={{ fontSize: "12px", color: "#6b7280" }}>{s.role || "Staff"} • {s.salary_type}</span>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <span style={{ display: "block", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Status</span>
                                    <span style={{
                                        background: s.payment_status === "paid" ? "#dcfce7" : "#fef9c3",
                                        color: s.payment_status === "paid" ? "#15803d" : "#854d0e",
                                        padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600"
                                    }}>
                                        {s.payment_status === "paid" ? "PAID" : "PENDING"}
                                    </span>
                                </div>
                            </div>

                            <div style={{ 
                                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", 
                                width: "100%", background: "#f9fafb", padding: "12px", borderRadius: "8px", marginBottom: "16px"
                            }}>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase" }}>Base Pay</div>
                                    <div style={{ fontWeight: 600 }}>₹{s.base_salary}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase" }}>Overtime</div>
                                    <div style={{ fontWeight: 600, color: "#16a34a" }}>+ ₹{s.overtime_amount}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase" }}>Penalty</div>
                                    <div style={{ fontWeight: 600, color: "#dc2626" }}>- ₹{s.penalty_amount}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase" }}>Advances</div>
                                    <div style={{ fontWeight: 600, color: "#dc2626" }}>- ₹{s.total_paid || 0}</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Net Payable</div>
                                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#4f46e5" }}>₹{s.final_salary}</div>
                                </div>

                                {s.payment_status !== "paid" && (
                                    <button 
                                        onClick={() => markPaid(s.id)}
                                        style={{
                                            background: "#4f46e5", color: "white", border: "none", 
                                            padding: "10px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer"
                                        }}
                                    >
                                        Settle Pay
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
