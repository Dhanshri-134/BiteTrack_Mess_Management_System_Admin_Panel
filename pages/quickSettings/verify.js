import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/verify.module.css";
import Layout from "../../components/Layout";

export default function Verify() {
  const router = useRouter();
  const { email: queryEmail } = router.query;

  const [form, setForm] = useState({ email: "", code: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (queryEmail) {
      setForm((prev) => ({ ...prev, email: queryEmail }));
    }
  }, [queryEmail]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Verifying...");

    try {
      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/verify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Verified! QR Code has been sent to your email.");
      } else {
        setMessage("❌ " + data.error);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Verification failed");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.main}>

      <div className={styles.card}>
        <h1>Verify Email</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            />
          <input
            type="text"
            name="code"
            placeholder="Verification Code"
            value={form.code}
            onChange={handleChange}
            required
          />
          <button type="submit">Verify</button>
        </form>
        {message && (
          <p
          className={`${styles.message} ${
              message.startsWith("✅")
              ? styles.success
              : message.startsWith("❌")
              ? styles.error
              : ""
            }`}
          >
            {message}
          </p>
        )}
      </div>
            </div>
    </div>
  );
}
