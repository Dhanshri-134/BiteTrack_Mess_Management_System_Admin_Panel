import { useState } from "react";
import styles from "../styles/login.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    try {
      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/auth/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg("Password reset code sent to email");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Forgot Password</h2>

        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="Registered email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {msg && <p style={{ color: "green" }}>{msg}</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" className={styles.loginBtn}>
            Send Reset Code
          </button>
        </form>
      </div>
    </div>
  );
}
