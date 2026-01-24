
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  BarChart3,
  Users,
  ClipboardList,
  Zap,
  CreditCard,
  MessageSquare,
  BookImageIcon,
  CalendarDays,
  LogOutIcon,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react";
import styles from "../styles/Sidebar.module.css";
import HardwareScanner from "./HardwareScanner";
import { useLanguage } from "../context/LanguageContext";
import { offlineFetch } from "@/lib/offlineFetch";


function decodeToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

export default function Sidebar({ closeSidebar }) {
  const router = useRouter();
  const { t } = useLanguage();

  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ✅ ACCORDION STATE (ONLY ONE OPEN)
  const [openSection, setOpenSection] = useState("management");

  const toggle = (key) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const decoded = decodeToken(token);
    if (decoded?.role) setRole(decoded.role);
  }, []);


useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const fetchProfile = async () => {
    try {
      const data = await offlineFetch("mess-profile", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/mess/profile/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      });

      if (data) setProfile(data);
    } catch (err) {
      console.error("Profile unavailable offline");
    } finally {
      setLoadingProfile(false);
    }
  };

  fetchProfile();
}, []);


  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login/");
  };

  // ✅ UPDATED SECTION (ACCORDION)
  const Section = ({ title, icon, openKey, children }) => {
    const isOpen = openSection === openKey;

    return (
      <>
        <button
          className={styles.sectionHeader}
          aria-expanded={isOpen}
          onClick={() => toggle(openKey)}
        >
          <span className={styles.sectionTitle}>
            {icon} {title}
          </span>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div
          className={`${styles.sectionBody} ${
            isOpen ? styles.sectionOpen : styles.sectionClosed
          }`}
        >
          {children}
        </div>
      </>
    );
  };

  return (
    <div className={styles.overlay} onClick={closeSidebar}>
      <aside className={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        {/* PROFILE BAR */}

        <div
          className={styles.profileBar}
        >
          <div className={styles.avatarWrapper}>
            {loadingProfile ? (
              <div className={styles.avatarSkeleton} />
            ) : (
              <img
                src={profile?.owner_photo || "/Assets/logo_Bite_Track.png"}

                alt="Profile"
                className={styles.avatar}
                onError={(e) => {
                  e.target.src = "/Assets/logo_Bite_Track.png";
                }}
              />
            )}
          </div>

          <div className={styles.profileInfo}>
            <p className={styles.profileName}>
              {loadingProfile ? "Loading..." : profile?.name || "My Mess"}
            </p>
            <span className={styles.profileRole}>
              {role === "STAFF" ? t("staff") : t("owner")}
            </span>
          </div>
        </div>

        {/* NAV */}
        <nav className={styles.nav}>
          {/* COMMON */}
          <Link href="/dashboard/" onClick={closeSidebar}>
            <BarChart3 /> {t("dashboard")}
          </Link>

          {/* STAFF */}
          {/* STAFF ACCESS */}
{role === "STAFF" && (
  <>

    <Link href="/attendance/" onClick={closeSidebar}>
      <ClipboardList /> {t("attendance")}
    </Link>

    <Link href="/quickSettings/" onClick={closeSidebar}>
      <Zap /> {t("quickActions")}
    </Link>

    <Link href="/menu/" onClick={closeSidebar}>
      <BookImageIcon /> {t("menu")}
    </Link>

    <Link href="/suggestions/" onClick={closeSidebar}>
      <MessageSquare /> {t("suggestions")}
    </Link>
  </>
)}


          {/* OWNER */}
          {role !== "STAFF" && (
            <>
              <Section
                title={t("management")}
                icon={<Users size={22} />}
                openKey="management"
              >
                <Link href="/users/" onClick={closeSidebar}>
                  {t("users")}
                </Link>
                <Link href="/menu/" onClick={closeSidebar}>
                  {t("menu")}
                </Link>
                <Link href="/leave/" onClick={closeSidebar}>
                  {t("leaves")}
                </Link>
              </Section>

              <Section
                title={t("billing")}
                icon={<CreditCard size={22} />}
                openKey="billing"
              >
                <Link href="/billing/" onClick={closeSidebar}>
                  {t("userBilling")}
                </Link>
                <Link href="/BillingMess/" onClick={closeSidebar}>
                  {t("billingMess")}
                </Link>
              </Section>

              <Section
                title={t("requests")}
                icon={<BookImageIcon size={22} />}
                openKey="requests"
              >
                <Link href="/cash-payments/" onClick={closeSidebar}>
                  {t("payments")}
                </Link>
                <Link href="/bookingRequests/" onClick={closeSidebar}>
                  {t("bookingRequests")}
                </Link>
                <Link href="/DeleteAccRequest/" onClick={closeSidebar}>
                  {t("deleteAccount")}
                </Link>
              </Section>

              <Link href="/suggestions/" onClick={closeSidebar}>
                <MessageSquare /> {t("suggestions")}
              </Link>

              <Link href="/settings/" onClick={closeSidebar}>
                <Settings /> {t("mess_settings")}
              </Link>
            </>
          )}


      
          {/* FOOTER */}
          <div className={styles.footer}>
            <div className={styles.logoutWrapper}>
              <button className={styles.logoutBtn} onClick={handleLogout}>
                <LogOutIcon size={18} /> {t("logout")}
              </button>
            </div>

            {role !== "STAFF" && <HardwareScanner />}

            <p className={styles.messageBanner}>
              BiteTrack – Powered By Shris Tech
            </p>
          </div>
        </nav>
      </aside>
    </div>
  );
}
