import Link from "next/link";
import { Home, CalendarCheck, Sliders, Settings, Users } from "lucide-react";
import styles from "../styles/footer.module.css";
import { useEffect, useState } from "react";

function decodeToken(token) {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function BottomNav() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decoded = decodeToken(token);
    if (decoded?.role) setRole(decoded.role);
  }, []);

  return (
    <nav className={styles.footer}>
      <Link href="/dashboard" className={styles.item}>
        <Home size={20} />
      </Link>

      <Link href="/attendance" className={styles.item}>
        <CalendarCheck size={20} />
      </Link>

      {/* ✅ USERS — OWNER ONLY */}
      {role !== "STAFF" && (
        <Link href="/users/" className={styles.item}>
          <Users size={20} />
        </Link>
      )}

      <Link href="/quickSettings" className={styles.item}>
        <Sliders size={20} />
      </Link>

      <Link href="/settings/app_settings" className={styles.item}>
        <Settings size={20} />
      </Link>
    </nav>
  );
}
