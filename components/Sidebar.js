
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getLocalDB } from "@/lib/localDB";
import { BarChart3, Users, ClipboardList, Zap, CreditCard, MessageSquare, BookImageIcon, CalendarDays, LogOutIcon, ChevronDown, ChevronRight, Settings, User
} from "lucide-react";
import styles from "../styles/Sidebar.module.css";
import HardwareScanner from "./HardwareScanner";
import { useLanguage } from "../context/LanguageContext";
import { offlineFetch } from "@/lib/offlineFetch";
import { API_BASE } from "../lib/api";


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

export default function Sidebar({ closeSidebar, isDesktop }) {
  const router = useRouter();
  const { t } = useLanguage();
  const sectionRefs = useRef({});
  const [messAccess, setMessAccess] = useState(null);
  const [loadingAccess, setLoadingAccess] = useState(true);
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

    const fetchAccess = async () => {
      try {
        const data = await offlineFetch("mess-access", async () => {
          const res = await fetch(
            `${API_BASE}/api/mess/access/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!res.ok) throw new Error("Failed to fetch access");
          return res.json();
        });

        setMessAccess(data || {});
      } catch (err) {
        console.error("Access unavailable offline");
        setMessAccess({});
      } finally {
        setLoadingAccess(false);
      }
    };

    fetchAccess();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const data = await offlineFetch("mess-profile", async () => {
          const res = await fetch(
            `${API_BASE}/api/mess/profile/`,
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


  const handleLogout = async () => {
    localStorage.clear();
    const db = await getLocalDB();
    if (db) {
      db.clear("cache");
      db.clear("queue");
    }
    router.replace("/login/");
  };


  const Section = ({ title, icon, openKey, children }) => {
    const isOpen = openSection === openKey;

    useEffect(() => {
      if (isOpen && sectionRefs.current[openKey]) {
        sectionRefs.current[openKey].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, [isOpen, openKey]);

    return (
      <>
        <button
          ref={(el) => (sectionRefs.current[openKey] = el)}
          className={`${styles.sectionHeader} ${isOpen ? styles.sectionHeaderActive : ""
            }`}
          onClick={() => toggle(openKey)}
        >
          <span className={styles.sectionTitle}>
            {icon} {title}
          </span>
          <ChevronDown
            size={18}
            className={isOpen ? styles.arrowOpen : styles.arrow}
          />
        </button>

        <div
          className={`${styles.sectionBody} ${isOpen ? styles.sectionOpen : styles.sectionClosed
            }`}
        >
          <div className={styles.sectionInner}>
            {children}
          </div>
        </div>

      </>
    );
  };


  return isDesktop ? (

    <aside className={styles.sidebar}>
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
            {profile?.name || "My Mess"}
          </p>
          <span className={styles.profileRole}>
            {profile?.secret_key}
            <br></br>
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



        {role === "STAFF" && (
          <>
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

        <Link href="/attendance/" onClick={closeSidebar}>
          {t("attendance")}
        </Link>
              <Link href="/users/" onClick={closeSidebar}>
                {t("users")}
              </Link>
              <Link href="/menu/" onClick={closeSidebar}>
                {t("menu")}
              </Link>
              {messAccess?.leaves !== false && (
                <Link href="/requests/leave/" onClick={closeSidebar}>
                  {t("leaves")}
                </Link>
              )}
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
              <Link href="/requests/cash-payments/" onClick={closeSidebar}>
                {t("payments")}
              </Link>
              <Link href="/requests/bookingRequests/" onClick={closeSidebar}>
                {t("bookingRequests")}
              </Link>
              <Link href="/requests/DeleteAccRequest/" onClick={closeSidebar}>
                {t("deleteAccount")}
              </Link>
            <Link href="/suggestions/" onClick={closeSidebar}>
             {t("suggestions")}
            </Link>
            </Section>

            
                          

  {messAccess?.staff !== false && (
                <Section
                title={t("staff")}
                icon={<User size={22} />}
                openKey="staff">
                 <Link href="/staff/dashboard/" onClick={closeSidebar}>
                  {t("staffDashboard")}
                </Link>

                </Section>
               )}

               {messAccess?.staff !== false && (
                <Section
                title={t("inventory")}
                icon={<User size={22} />}
                openKey="inventory">
                 <Link href="/inventory/dashboard/" onClick={closeSidebar}>
                  {t("dashboard")}
                </Link>

                <Link href="/inventory/items/" onClick={closeSidebar}>
                  {t("Items")}
                </Link>

                <Link href="/inventory/categories/" onClick={closeSidebar}>
                  {t("categories")}
                </Link>

                <Link href="/inventory/vendors/" onClick={closeSidebar}>
                  {t("vendors")}
                </Link>

                
                <Link href="/inventory/add-purchases/">
                  {t("addpurchases")}
                </Link>
                <Link href="/inventory/purchase-history/">
                  {t("purchaseHistory")}
                </Link>
                <Link href="/inventory/usage/">
                  {t("usage")}
                </Link>
                
                <Link href="/inventory/stock-ledger/">
                  {t("stockLedger")}
                </Link>
                
                </Section>
               )}

            <Section
              title={t("settings")}
              icon={<BookImageIcon size={22} />}
              openKey="settings"
            >

              <Link href="/settings/" onClick={closeSidebar}>
                {t("mess_settings")}
              </Link>
              <Link href="/settings/app_settings" className={styles.item}>
                {t("appSettings")}

              </Link>

            </Section>
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
            BiteTrack
            <br></br> Powered By Shris Tech
          </p>
        </div>
      </nav>
    </aside>
  ) : (
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
              {profile?.name || "My Mess"}
            </p>
            <span className={styles.profileRole}>
              {profile?.secret_key}
              <br></br>
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
                {messAccess?.leaves !== false && (
                  <Link href="/requests/leave/" onClick={closeSidebar}>
                    {t("leaves")}
                  </Link>
                )}
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
                <Link href="/requests/cash-payments/" onClick={closeSidebar}>
                  {t("payments")}
                </Link>
                <Link href="/requests/bookingRequests/" onClick={closeSidebar}>
                  {t("bookingRequests")}
                </Link>
                <Link href="/requests/DeleteAccRequest/" onClick={closeSidebar}>
                  {t("deleteAccount")}
                </Link>
              <Link href="/suggestions/" onClick={closeSidebar}>
                {t("suggestions")}
              </Link>
              </Section>


              {messAccess?.staff !== false && (
                <Section
                title={t("staff")}
                icon={<User size={22} />}
                openKey="staff">
                 <Link href="/staff/dashboard/" onClick={closeSidebar}>
                  {t("staffDashboard")}
                </Link>

                <Link href="/staff/list/" onClick={closeSidebar}>
                  {t("staffList")}
                </Link>

                <Link href="/staff/attendance/" onClick={closeSidebar}>
                  {t("staffAttendance")}
                </Link>

                <Link href="/staff/attendance-history/" onClick={closeSidebar}>
                  {t("attendanceHistory")}
                </Link>

                
                <Link href="/staff/salary/">
                  Salary
                </Link>
                </Section>
               )}
              {messAccess?.staff !== false && (
                <Section
                title={t("inventory")}
                icon={<User size={22} />}
                openKey="inventory">
                 <Link href="/inventory/dashboard/" onClick={closeSidebar}>
                  {t("dashboard")}
                </Link>

                <Link href="/inventory/items/" onClick={closeSidebar}>
                  {t("Items")}
                </Link>

                <Link href="/inventory/categories/" onClick={closeSidebar}>
                  {t("categories")}
                </Link>

                <Link href="/inventory/vendors/" onClick={closeSidebar}>
                  {t("vendors")}
                </Link>

                
                <Link href="/inventory/add-purchases/">
                  {t("addpurchases")}
                </Link>
                <Link href="/inventory/purchase-history/">
                  {t("purchaseHistory")}
                </Link>
                <Link href="/inventory/usage/">
                  {t("usage")}
                </Link>
                
                <Link href="/inventory/stock-ledger/">
                  {t("stockLedger")}
                </Link>
                
                </Section>
               )}


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
              BiteTrack
              <br></br> Powered By Shris Tech
            </p>
          </div>
        </nav>
      </aside>
    </div>
  );
}
