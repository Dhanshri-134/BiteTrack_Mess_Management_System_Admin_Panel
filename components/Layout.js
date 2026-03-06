
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import BottomNav from "./Footer";
import useAuth from "../hooks/useAuth";
import styles from "../styles/layout.module.css";
import { API_BASE } from "../lib/api";

export default function Layout({ children }) {
  useAuth(); 
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [expired, setExpired] = useState(false);

const [isDesktop, setIsDesktop] = useState(false);

useEffect(() => {
  const handleResize = () => {
    const desktop = window.innerWidth >= 768;
    setIsDesktop(desktop);
    setSidebarOpen(desktop); // always open on desktop
  };

  handleResize();
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);
  // ✅ Subscription check (run once, guarded)
  useEffect(() => {
    // 🚫 Skip check on auth pages
    if (
      router.pathname === "/login" ||
      router.pathname === "/registerMess" ||
      router.pathname === "/forgot-password"
    ) {
      setChecking(false);
      return;
    }

    const checkSubscription = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setChecking(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/subscription/check/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 402) {
          setExpired(true);
        }
      } catch (err) {
        console.error("Subscription check failed", err);
      } finally {
        setChecking(false);
      }
    };

    checkSubscription();
  }, [router.pathname]);

  useEffect(() => {
  const handleResize = () => {
    setSidebarOpen(window.innerWidth > 768);
  };

  handleResize();
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);


 

  // 🚫 Subscription expired
  if (expired) {
    return (
      <div className={styles.expiredWrapper}>
        <h1>🚫 Subscription Expired</h1>
        <p>Your subscription has ended.</p>
        <p>Please renew to continue using BiteTrack.</p>
      </div>
    );
  }

  // ✅ Normal layout
  return (
    <div className={styles.container}>
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className={styles.body}>
        {(isDesktop || sidebarOpen) && (
          <Sidebar
            closeSidebar={() => {
              if (!isDesktop) setSidebarOpen(false);
            }}
            isDesktop={isDesktop}
          />
        )}

        <main className={styles.main}>{children}</main>

      </div>
      {!isDesktop && <BottomNav />}

    </div>
  );
}
