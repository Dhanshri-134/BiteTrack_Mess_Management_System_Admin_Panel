import { useLanguage } from "../context/LanguageContext";

import { useEffect, useState } from "react";
import { Menu, Bell, LogOutIcon, RefreshCcw ,Zap} from "lucide-react";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "../styles/navbar.module.css";
import LanguageToggle from "./LanguageToggle";
import { triggerRefresh } from "@/lib/refreshBus";
import toast from "react-hot-toast";

export default function Navbar({ sidebarOpen, setSidebarOpen,isDesktop }) {
  const { t } = useLanguage();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login/");
  };

  return (
    <nav className={styles.navbar}>
      {/* LEFT */}
      <div className={styles.left}>
        <button
          className={styles.menuBtn}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={22} />
        </button>

        <span className={styles.logo}>{t("biteTrack")}</span>
      </div>

      {/* RIGHT */}
      <div className={styles.right}>
        {/* 🌐 LANGUAGE TOGGLE */}
        <LanguageToggle />



<button
  onClick={() => {
    toast.success(t("Refreshing..."));
    triggerRefresh();
  }}
  className={styles.refreshBtn}
  title={t("refresh")}
>
  <RefreshCcw size={20} />
</button>

        <Link href="/notifications/" className={styles.iconBtn}>
          <Bell size={20} />
        </Link>

        {/* {isLoggedIn ? (
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOutIcon size={18} />
          </button>
        ) : (
          <button
            className={styles.loginBtn}
            onClick={() => router.push("/login/")}
          >
            Login
          </button>
        )} */}

{isDesktop && (
        <Link href="/quickSettings/" className={styles.iconBtn}>
              <Zap size={20}/> 
            </Link>)}
      </div>
    </nav>
  );
}
