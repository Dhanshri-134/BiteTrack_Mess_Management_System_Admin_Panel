import { useLanguage } from "../../../context/LanguageContext";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";
import { Banknote } from "lucide-react";

export default function StaffPayments() {
  const { t } = useLanguage();

  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    amount: "",
    payment_type: "Advance",
    payment_mode: "Cash",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      
      const res = await staffRequest("/api/staff/list/", { method: "GET" });
      const found = res.find(s => String(s.id) === String(id));
      if (!found) {
        toast.error("Staff not found");
        return;
      }
      setProfile(found);

      const pRes = await staffRequest("/api/staff/payments/list/", {
        method: "POST",
        body: { staff_id: found.id } // omitting month/year fetches all payments
      });
      if (pRes.success) setPayments(pRes.data);

    } catch (err) {
      toast.error("Error loading payments");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount) {
      toast.error("Amount is required");
      return;
    }

    try {
      setSaving(true);
      await staffRequest("/api/staff/payments/create/", {
        body: {
          staff_id: profile.id,
          amount: Number(form.amount),
          payment_type: form.payment_type + " (" + form.payment_mode + ")", 
          notes: form.notes
        }
      });
      toast.success("Payment recorded");
      setForm({ amount: "", payment_type: "Advance", payment_mode: "Cash", notes: "" });
      fetchData();
    } catch {
      toast.error("Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

  const paymentSummary = useMemo(() => {
    const totals = payments.reduce(
      (acc, payment) => {
        const type = String(payment.payment_type || "").toLowerCase();
        const amount = Number(payment.amount || 0);

        acc.totalPaid += amount;
        if (type.includes("advance")) acc.advancePaid += amount;
        if (type.includes("partial")) acc.partialPaid += amount;
        if (type.includes("final")) acc.finalPaid += amount;

        return acc;
      },
      { totalPaid: 0, advancePaid: 0, partialPaid: 0, finalPaid: 0 }
    );

    return {
      ...totals,
      remainingBalance: Number(profile?.current_balance || 0),
      paymentCount: payments.length,
    };
  }, [payments, profile?.current_balance]);

  if (loading && !profile) return <Layout><div className={styles.container}>{t("loading")}</div></Layout>;
  if (!profile) return <Layout><div className={styles.container}>{t("notFound")}</div></Layout>;

  return (
    <Layout title={`Payments: ${profile.name}`}>
      <div className={styles.profileContainer}>

        {/* Header / Info */}
        <div className={styles.profileHeader} style={{ marginBottom: "1.5rem" }}>
          <div className={styles.avatar}>{profile.name.charAt(0)}</div>
          <div className={styles.profileInfo}>
            <h1 className={styles.profileName}>{profile.name}</h1>
            <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>Role: {profile.role}</span>
          </div>
        </div>

        {/* Outstanding Balance Context */}
        <div className={styles.balanceCard}>
          <h3>{t("currentBalance")}</h3>
          <h2>₹ {Number(profile.current_balance || 0).toFixed(2)}</h2>
          <p style={{ fontSize: "0.80rem", opacity: 0.9, marginTop: "0.5rem" }}>{t("balanceTotalEarningsTotalPayments")}</p>
        </div>

        <div className={styles.paymentSummaryGrid} style={{ marginBottom: "1.5rem" }}>
          <div className={styles.summaryBox}>
            <span>{t("totalPaid")}</span>
            <strong>Rs {paymentSummary.totalPaid.toFixed(2)}</strong>
          </div>
          <div className={styles.summaryBox}>
            <span>{t("advancePaid")}</span>
            <strong>Rs {paymentSummary.advancePaid.toFixed(2)}</strong>
          </div>
          <div className={styles.summaryBox}>
            <span>{t("partialPaid")}</span>
            <strong>Rs {paymentSummary.partialPaid.toFixed(2)}</strong>
          </div>
          <div className={styles.summaryBox}>
            <span>{t("finalPaid")}</span>
            <strong>Rs {paymentSummary.finalPaid.toFixed(2)}</strong>
          </div>
          <div className={`${styles.summaryBox} ${styles.summaryBoxWide}`}>
            <span>{t("remainingBalance")}</span>
            <strong>Rs {paymentSummary.remainingBalance.toFixed(2)}</strong>
          </div>
        </div>

        {/* Add Payment Form */}
        <h3 className={styles.sectionTitle}>{t("addPayment")}</h3>
        <form onSubmit={handleSubmit} className={styles.tableBox} style={{ padding: "1rem", marginBottom: "1.5rem" }}>
          
          <div className={styles.formGroup}>
            <label>{t("amount")}</label>
            <input 
              type="number" 
              className={styles.formInput} 
              value={form.amount} 
              onChange={e => setForm({...form, amount: e.target.value})} 
              placeholder={t("000")}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.5rem", color: "#374151" }}>{t("type")}</label>
              <select className={styles.formInput} value={form.payment_type} onChange={e => setForm({...form, payment_type: e.target.value})}>
                <option>{t("advance")}</option>
                <option>{t("partial")}</option>
                <option>{t("final")}</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.5rem", color: "#374151" }}>{t("mode")}</label>
              <select className={styles.formInput} value={form.payment_mode} onChange={e => setForm({...form, payment_mode: e.target.value})}>
                <option>{t("cash")}</option>
                <option>{t("uPI")}</option>
                <option>{t("bankTransfer")}</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>{t("note")}</label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={form.notes} 
              onChange={e => setForm({...form, notes: e.target.value})} 
              placeholder={t("eGNovemberAdvance")}
            />
          </div>

          <button type="submit" className={styles.btnPrimary} disabled={saving}>
            {saving ? "Saving..." : "Record Payment"}
          </button>
        </form>

        {/* Payment Timeline */}
        <h3 className={styles.sectionTitle}>{t("paymentTimeline")}</h3>
        <p className={styles.summaryHint}>{paymentSummary.paymentCount} payment record{paymentSummary.paymentCount === 1 ? "" : "s"} found for this staff member.</p>
        <div className={styles.timelineList}>
          {payments.length === 0 ? <p className={styles.emptyMsg}>{t("noPaymentsFound")}</p> : (
            payments.map((p, idx) => {
              return (
                <div key={p.id} className={styles.timelineItem} style={{ borderLeft: "4px solid #007170" }}>
                  <div className={styles.tlIcon} style={{ background: "#f0fdfa", color: "#007170" }}><Banknote size={20} /></div>
                  <div className={styles.tlDetails}>
                    <div className={styles.tlRow}>
                      <strong style={{ fontSize: "1rem", color: "#111827" }}>{p.payment_type}</strong>
                      <span className={styles.tlAmount} style={{ color: "#dc2626" }}>- ₹{p.amount}</span>
                    </div>
                    <div className={styles.tlRow2}>
                      <span className={styles.tlDate}>{new Date(p.payment_date).toLocaleDateString()}</span>
                      {p.notes && <span className={styles.tlNotes} style={{ color: "#4b5563" }}>{p.notes}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </Layout>
  );
}
