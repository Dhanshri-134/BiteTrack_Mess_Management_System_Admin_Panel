import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { getLocalDB } from "@/lib/localDB";
import {
  BarChart3,
  BookImageIcon,
  Boxes,
  Briefcase,
  ChevronDown,
  ClipboardList,
  CompassIcon,
  CreditCard,
  LayoutDashboard,
  LogOutIcon,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  User,
  Users,
  Zap,
} from "lucide-react";
import styles from "../styles/Sidebar.module.css";
import HardwareScanner from "./HardwareScanner";
import { useLanguage } from "../context/LanguageContext";
import { offlineFetch } from "@/lib/offlineFetch";
import { API_BASE } from "@/lib/api";

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

function normalizePath(path) {
  if (!path) return "/";
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}

function SidebarSection({
  title,
  icon,
  sectionKey,
  children,
  isOpen,
  isCurrent,
  onToggle,
}) {
  return (
    <>
      <button
        type="button"
        className={`${styles.sectionHeader} ${
          isCurrent ? styles.sectionHeaderCurrent : isOpen ? styles.sectionHeaderActive : ""
        }`}
        onClick={() => onToggle(sectionKey)}
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
        className={`${styles.sectionBody} ${
          isOpen ? styles.sectionOpen : styles.sectionClosed
        }`}
      >
        <div className={styles.sectionInner}>{children}</div>
      </div>
    </>
  );
}

export default function Sidebar({ closeSidebar, isDesktop }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [messAccess, setMessAccess] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [openSection, setOpenSection] = useState(null);

  const currentPath = normalizePath(router.pathname);
  const handleClose = () => {
    if (typeof closeSidebar === "function") {
      closeSidebar();
    }
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
          const res = await fetch(`${API_BASE}/api/mess/access/`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) throw new Error("Failed to fetch access");
          return res.json();
        });

        setMessAccess(data || {});
      } catch (error) {
        console.error("Access unavailable offline", error);
        setMessAccess({});
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
          const res = await fetch(`${API_BASE}/api/mess/profile/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Failed to fetch profile");
          return res.json();
        });

        if (data) setProfile(data);
      } catch (error) {
        console.error("Profile unavailable offline", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  const ownerSections = useMemo(() => {
    const sections = [
      {
        key: "management",
        title: t("management"),
        icon: <LayoutDashboard size={22} />,
        items: [
          { path: "/attendance/", label: t("attendance") },
          { path: "/users/", label: t("users") },
          { path: "/menu/", label: t("menu") },
          ...(messAccess?.leaves === false
            ? []
            : [{ path: "/requests/leave/", label: t("leave") }]),
        ],
      },
      {
        key: "billing",
        title: t("billing"),
        icon: <Receipt size={22} />,
        items: [
          { path: "/billing/", label: t("userBilling") },
          { path: "/BillingMess/", label: t("billingMess") },
        ],
      },
      {
        key: "requests",
        title: t("requests"),
        icon: <ClipboardList size={22} />,
        items: [
          { path: "/requests/cash-payments/", label: t("payments") },
          { path: "/requests/bookingRequests/", label: t("bookingRequests") },
          { path: "/requests/DeleteAccRequest/", label: t("deleteAccount") },
          { path: "/suggestions/", label: t("suggestions") },
        ],
      },
      ...(messAccess?.inventory === false
     ? []
     : [
      {
        key: "inventory",
        title: t("inventory"),
        icon: <Boxes size={22} />,
        items: [
          { path: "/inventory/dashboard/", label: t("dashboard") },
          { path: "/inventory/categories/", label: t("material") },
          { path: "/inventory/items/", label: t("stock") },
          { path: "/inventory/vendors/", label: t("vendor") },
          { path: "/inventory/purchase-history/", label: t("Purchases") },
          { path: "/inventory/usage/", label: t("usage") },
        ],
      }]),
      ...(messAccess?.staff === false
        ? []
        : [
            {
              key: "staff",
              title: t("staff"),
              icon: <Users size={22} />,
              items: [
                { path: "/staff/dashboard/", label: t("dashboard") },
                { path: "/staff/list/", label: t("staffDirectory") },
                { path: "/staff/attendance/", label: t("attendance") },
                { path: "/staff/attendance-history/", label: t("attendanceHistory") },
                { path: "/staff/salary/history/", label: t("salaryManagement") },
              ],
            },
          ]),
      {
        key: "settings",
        title: "Settings",
        icon: <Settings size={22} />,
        items: [
          { path: "/settings/", label: "Mess Setting" },
          { path: "/settings/app_settings/", label: "App Setting" },
        ],
      },
    ];

    return sections;
  }, [messAccess?.inventory, messAccess?.leaves, messAccess?.staff, t]);

  useEffect(() => {
    if (role === "STAFF") {
      setOpenSection(null);
      return;
    }

    const matchingSection = ownerSections.find((section) =>
      section.items.some((item) => normalizePath(item.path) === currentPath)
    );

    setOpenSection(matchingSection?.key || null);
  }, [currentPath, ownerSections, role]);

  const isActivePath = (path) => {
    const normalizedTarget = normalizePath(path);
    if (normalizedTarget === "/") return currentPath === "/";
    return (
      currentPath === normalizedTarget ||
      currentPath.startsWith(`${normalizedTarget}/`)
    );
  };
  const sectionHasCurrentRoute = (section) =>
    section.items.some((item) => isActivePath(item.path));

  const handleLogout = async () => {
    localStorage.clear();
    const db = await getLocalDB();
    if (db) {
      db.clear("cache");
      db.clear("queue");
    }
    router.replace("/login/");
  };

  const renderProfile = () => (
    <div className={styles.profileBar}>
      <div className={styles.avatarWrapper}>
        {loadingProfile ? (
          <div className={styles.avatarSkeleton} />
        ) : (
          <img
            src={profile?.owner_photo || "/Assets/logo_Bite_Track.png"}
            alt={t("profile")}
            className={styles.avatar}
            onError={(event) => {
              event.target.src = "/Assets/logo_Bite_Track.png";
            }}
          />
        )}
      </div>

      <div className={styles.profileInfo}>
        <p className={styles.profileName}>{profile?.name || t("myMess")}</p>
        <span className={styles.profileRole}>
          {profile?.secret_key}
          <br />
          {role === "STAFF" ? t("staff") : t("owner")}
        </span>
      </div>
    </div>
  );

  const renderLink = (path, icon, label, extraClass = "") => (
    <Link
      key={path}
      href={path}
      onClick={handleClose}
      className={`${styles.navLink} ${isActivePath(path) ? styles.navLinkActive : ""} ${extraClass}`.trim()}
    >
      {icon} {label}
    </Link>
  );

  const renderOwnerNav = () => (
    <>
      {ownerSections.map((section) => {
        const sectionIsCurrent = sectionHasCurrentRoute(section);
        const sectionIsOpen = openSection === section.key;

        return (
          <SidebarSection
            key={section.key}
            title={section.title}
            icon={section.icon}
            sectionKey={section.key}
            isOpen={sectionIsOpen}
            isCurrent={sectionIsCurrent}
            onToggle={(key) => setOpenSection((prev) => (prev === key ? null : key))}
          >
            {section.items.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleClose}
                className={`${styles.sectionLink} ${
                  isActivePath(item.path) ? styles.sectionLinkActive : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </SidebarSection>
        );
      })}
    </>
  );

  const renderStaffNav = () => (
    <>
      {renderLink("/attendance/", <ClipboardList size={20} />, t("attendance"))}
      {renderLink("/quickSettings/", <Zap size={20} />, t("quickActions"))}
      {renderLink("/menu/", <BookImageIcon size={20} />, t("menu"))}
      {renderLink("/suggestions/", <MessageSquare size={20} />, t("suggestions"))}
    </>
  );

  const renderContent = () => (
    <>
      {renderProfile()}

      <nav className={styles.nav}>
        {renderLink("/dashboard/", <BarChart3 size={20} />, t("dashboard"))}
        {role === "STAFF" ? renderStaffNav() : renderOwnerNav()}

        <div className={styles.footer}>
          <div className={styles.logoutWrapper}>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              <LogOutIcon size={18} /> {t("logout")}
            </button>
          </div>

          {role !== "STAFF" ? <HardwareScanner /> : null}

          <p className={styles.messageBanner}>
            {t("biteTrack")}
            <br />
            {t("poweredByShrisTech")}
          </p>
        </div>
      </nav>
    </>
  );

  if (isDesktop) {
    return <aside className={styles.sidebar}>{renderContent()}</aside>;
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <aside className={styles.sidebar} onClick={(event) => event.stopPropagation()}>
        {renderContent()}
      </aside>
    </div>
  );
}
