import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import LanguageToggle from "../components/LanguageToggle";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function RegisterMess() {
  const router = useRouter();
  const { t } = useLanguage();
  const { lang, toggleLanguage } = useLanguage();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    per_day_rate: "",
    monthly_price: "",
    allowed_leave_days: "",
    open_time: "",
    location: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/auth/register-mess/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.message || t("registrationFailed"));
        return;
      }

      router.push("/register-success");
    } catch (err) {
      setLoading(false);
      setError(t("somethingWentWrong"));
    }
  };

  return (
    <div className={styles.container}>
      {/* LOGO */}
      <img
        src="/Assets/logo_Bite_Track.png"
        alt={t("biteTrackLogoAlt")}
        className={styles.logo}
      />

      {/* LANGUAGE TOGGLE */}
      <div className="toggleLang">
        <button onClick={toggleLanguage} className={styles.toggleBtn}>
          {lang === "en" ? "मराठी ?" : "English ?"}
        </button>
      </div>

      <div className={styles.card}>
        <h1 className={styles.Header}>🍽️ {t("biteTrack")}</h1>

        <form className={`${styles.form} ${styles.fade}`} onSubmit={handleSubmit}>
          <h2 className={styles.title}>{t("registerMess")}</h2>
          <p className={styles.subtitle}>
            {t("approvalRequiredMessage")}
          </p>

          {/* MESS NAME */}
          <div className={styles.formGroup}>
            <label>{t("messName")} *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* EMAIL */}
          <div className={styles.formGroup}>
            <label>{t("email")} *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* PASSWORD */}
          <div className={styles.formGroup}>
            <label>{t("password")} *</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </span>
            </div>
          </div>

          {/* PER DAY RATE */}
          <div className={styles.formGroup}>
            <label>{t("perDayRate")} (₹) *</label>
            <input
              type="number"
              step="0.01"
              name="per_day_rate"
              value={form.per_day_rate}
              onChange={handleChange}
              required
            />
          </div>

          {/* MONTHLY PRICE */}
          <div className={styles.formGroup}>
            <label>{t("monthlyPrice")} (₹)</label>
            <input
              name="monthly_price"
              value={form.monthly_price}
              onChange={handleChange}
            />
          </div>

          {/* LEAVE DAYS */}
          <div className={styles.formGroup}>
            <label>{t("allowedLeaveDays")}</label>
            <input
              type="number"
              name="allowed_leave_days"
              value={form.allowed_leave_days}
              onChange={handleChange}
            />
          </div>

          {/* OPEN TIME */}
          <div className={styles.formGroup}>
            <label>{t("openTime")}</label>
            <input
              name="open_time"
              placeholder={t("8AM10PM")}
              value={form.open_time}
              onChange={handleChange}
            />
          </div>

          {/* LOCATION */}
          <div className={styles.formGroup}>
            <label>{t("location")}</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.loginBtn}
            disabled={loading}
          >
            {loading ? t("submitting") : t("submitForApproval")}
          </button>

          <div className={styles.regbtn}>
            {t("alreadyHaveAccount")}{" "}
            <span
              className={styles.forgot}
              onClick={() => router.push("/login")}
            >
              {t("login")}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
