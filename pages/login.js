import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../styles/login.module.css";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
const { lang, toggleLanguage } = useLanguage();
  const [loginType, setLoginType] = useState("owner"); // owner | staff
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) router.push("/dashboard/");
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const apiUrl =
      loginType === "owner"
        ? "https://bite-track-mess-management-system-a.vercel.app/api/auth/login/"
        : "https://bite-track-mess-management-system-a.vercel.app/api/auth/staff-login/";

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("loginFailed"));

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", loginType);

      router.replace("/dashboard/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <img
        src="/Assets/logo_Bite_Track.png"
        alt={t("biteTrackLogoAlt")}
        className={styles.logo}
      />
      <div className="toggleLang">
        <button onClick={toggleLanguage} className={styles.toggleBtn}>
      {lang === "en" ? "मराठी ?" : "English ?"}
    </button>
        </div>

      <div className={styles.card}>
        <h1 className={styles.Header}>🍽️ {t("biteTrack")}</h1>

        {/* 🔹 TABS */}
        <div className={styles.tabs}>
          <div
            className={`${styles.slider} ${
              loginType === "staff" ? styles.right : ""
            }`}
          />

          <button
            type="button"
            className={`${styles.tab} ${
              loginType === "owner" ? styles.active : ""
            }`}
            onClick={() => setLoginType("owner")}
          >
            {t("owner")}
          </button>

          <button
            type="button"
            className={`${styles.tab} ${
              loginType === "staff" ? styles.active : ""
            }`}
            onClick={() => setLoginType("staff")}
          >
            {t("staff")}
          </button>
        </div>

        <form
          className={`${styles.form} ${styles.fade}`}
          onSubmit={handleSubmit}
          key={loginType} // 👈 forces smooth transition
        >
          <h2 className={styles.title}>
            {loginType === "owner" ? t("ownerLogin") : t("staffLogin")}
          </h2>

          <div className={styles.formGroup}>
            <label>{t("email")}</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>{t("password")}</label>
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

          <div className={styles.forgot}>
            <span onClick={() => router.push("/forgot-password")}>
              {t("forgotPassword")}
            </span>
              
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.loginBtn}
            disabled={loading}
          >
            {loading ? t("loggingIn") : t("login")}
          </button>

          {loginType === "owner" && (
            <div className={styles.regbtn}>
              {t("wantToCreateAccount")}{" "}
              <span
                onClick={() => router.push("/registerMess")}
                className={styles.forgot}
              >
                {t("registerHere")}
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// import { useState,useEffect } from "react";
// import { useRouter } from "next/router";
// import styles from "../styles/login.module.css";
// import { Eye, EyeOff } from "lucide-react";


// export default function Login() {
//   const [showPassword, setShowPassword] = useState(false);

//   const router = useRouter();
//   const [form, setForm] = useState({ email: "", password: "" });
//   const [error, setError] = useState("");

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");

//     try {
//       const res = await fetch(
//         "https://bite-track-mess-management-system-a.vercel.app/api/auth/login/",
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(form),
//         }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Login failed");
//       if (!data.token) throw new Error("No token received");

//       localStorage.setItem("token", data.token);
//       localStorage.setItem("user", JSON.stringify(data.mess));

//       router.replace("/dashboard/");
//     } catch (err) {
//       setError(err.message);
//     }
//   };
//   useEffect(() => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     router.push("/dashboard/");
//   }
// }, []);


//   return (
//     <div className={styles.container}>
//       <div className={styles.card}>

//         {/* ✅ LOGO IMAGE */}
//         <img
//           src="/Assets/logo_Bite_Track.png"
//           alt="BiteTrack Logo"
//           className={styles.logo}
//         />
// <h1 className={styles.Header}>🍽️ BiteTrack</h1>
//         <h2 className={styles.title}>Login</h2>

//         <form className={styles.form} onSubmit={handleSubmit}>
//           <div className={styles.formGroup}>
//             <label>Email</label>
//             <input
//               type="email"
//               name="email"
//               value={form.email}
//               onChange={handleChange}
//               required
//             />
//           </div>

//          <div className={styles.formGroup}>
//   <label>Password</label>

//   <div className={styles.passwordWrapper}>
//     <input
//       type={showPassword ? "text" : "password"}
//       name="password"
//       value={form.password}
//       onChange={handleChange}
//       required
//     />

//     <span
//       className={styles.eyeIcon}
//       onClick={() => setShowPassword(!showPassword)}
//     >
//       {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
//     </span>
//   </div>
// </div>


//           {/* ✅ FORGOT PASSWORD */}
//           <div className={styles.forgot}>
//             <span onClick={() => router.push("/forgot-password")}>
//               Forgot password?
//             </span>
//           </div>

//           {error && <p className={styles.error}>{error}</p>}

//           <button type="submit" className={styles.loginBtn}>
//             Login
//           </button>
//           <div className={styles.forgot}>
//               Want to create new account ?
//             <span onClick={() => router.push("/registerMess")}>
//               Register Here
//             </span>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }
