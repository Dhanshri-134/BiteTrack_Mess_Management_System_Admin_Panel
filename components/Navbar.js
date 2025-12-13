import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import { Bell, Settings } from "lucide-react";
import Link from "next/link";
import styles from "../styles/navbar.module.css";

export default function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Check login state
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    alert("Logged out successfully ✅");
    router.push("/login");
  };

  // 🔄 Refresh the page
  const handleRefresh = () => {
    window.location.reload();
  };

  // ⬅️ Go back to previous page
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard"); // fallback
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.leftSection}>
        {/* Back Button */}
        <button className={styles.backBtn} onClick={handleBack} title="Go Back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        {/* Logo */}
        <div className={styles.logo}>
          BiteTrack <span>- Mess Management System</span>
        </div>
      </div>

      <div className={styles.title}>Sanskruti Mess and Kitchen</div>

      <div className={styles.actions}>
        {/* Notifications */}
        <div className={styles.actions}>
  {/* Notifications */}
  <div className={styles.notificationWrapper}>
    <Link href="/notifications" className={styles.iconBtn} title="Notifications">
      <Bell size={20} />
    </Link>
    <Link href="/settings" className={styles.iconBtn} title="Notifications">
      <Settings size={20} />
    </Link>
        {/* Refresh */}
        <button className={styles.iconBtn} title="Refresh Page" onClick={handleRefresh}>
          🔄
        </button>
  </div>
</div>


        {/* Auth */}
        {isLoggedIn ? (
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <button className={styles.loginBtn} onClick={() => router.push("/login")}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
