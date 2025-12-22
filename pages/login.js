import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const res = await fetch("https://bitetrack-shrisflagships-projects.vercel.app/api/auth/login", {
    // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

   if (!data.token) throw new Error("No token received from server");

localStorage.setItem("token", data.token);
localStorage.setItem("user", JSON.stringify(data.mess));
router.push("/dashboard");

  } catch (err) {
    setError(err.message);
  }
};


  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.logo}>🍽️ BiteTrack</h1>
        <h2 className={styles.title}>Login</h2>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <button type="submit" className={styles.loginBtn}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
