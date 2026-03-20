import { useState } from "react";
import styles from "../styles/forgotpassword.module.css";
import { API_BASE } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("forgotPasswordFailed"));

      setMsg(t("forgotPasswordMailSent"));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>{t("forgotPasswordTitle")}</h2>

        <form onSubmit={submit}>
          <input
            type="email"
            placeholder={t("registeredEmailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {msg && <p style={{ color: "green" }}>{msg}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" className={styles.loginBtn}>
            {t("sendEmail")}
          </button>
        </form>
      </div>
    </div>
  );
}
