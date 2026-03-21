import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staffMobile.module.css";
import toast from "react-hot-toast";
import { staffRequest } from "@/lib/staffClient";
import { Banknote } from "lucide-react";

export default function StaffPayments() {
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

  if (loading && !profile) return <Layout><div className={styles.container}>Loading...</div></Layout>;
  if (!profile) return <Layout><div className={styles.container}>Not Found</div></Layout>;

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
          <h3>Current Balance</h3>
          <h2>₹ {Number(profile.current_balance || 0).toFixed(2)}</h2>
          <p style={{ fontSize: "0.80rem", opacity: 0.9, marginTop: "0.5rem" }}>Balance = Total Earnings - Total Payments</p>
        </div>

        {/* Add Payment Form */}
        <h3 className={styles.sectionTitle}>Add Payment</h3>
        <form onSubmit={handleSubmit} className={styles.tableBox} style={{ padding: "1rem", marginBottom: "1.5rem" }}>
          
          <div className={styles.formGroup}>
            <label>Amount (₹)</label>
            <input 
              type="number" 
              className={styles.formInput} 
              value={form.amount} 
              onChange={e => setForm({...form, amount: e.target.value})} 
              placeholder="0.00"
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.5rem", color: "#374151" }}>Type</label>
              <select className={styles.formInput} value={form.payment_type} onChange={e => setForm({...form, payment_type: e.target.value})}>
                <option>Advance</option>
                <option>Partial</option>
                <option>Final</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.5rem", color: "#374151" }}>Mode</label>
              <select className={styles.formInput} value={form.payment_mode} onChange={e => setForm({...form, payment_mode: e.target.value})}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Note</label>
            <input 
              type="text" 
              className={styles.formInput} 
              value={form.notes} 
              onChange={e => setForm({...form, notes: e.target.value})} 
              placeholder="e.g. November Advance"
            />
          </div>

          <button type="submit" className={styles.btnPrimary} disabled={saving}>
            {saving ? "Saving..." : "Record Payment"}
          </button>
        </form>

        {/* Payment Timeline */}
        <h3 className={styles.sectionTitle}>Payment Timeline</h3>
        <div className={styles.timelineList}>
          {payments.length === 0 ? <p className={styles.emptyMsg}>No payments found.</p> : (
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
