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
      <span>
        
        <Home size={22}/>
      </span>
      </Link>

      <Link href="/attendance" className={styles.item}>
      <span>
        
        <CalendarCheck size={22} />
      </span>
      </Link>

      {/* ✅ USERS — OWNER ONLY */}
      {role !== "STAFF" && (
        <Link href="/users/" className={styles.item}>
      <span>
          <Users size={22} />
      </span>
        </Link>
      )}

      <Link href="/quickSettings" className={styles.item}>
      <span>
        <Sliders size={22} />
      </span>
      </Link>

      <Link href="/settings/app_settings" className={styles.item}>
        
      <span>
        <Settings size={22} />
      </span>
      </Link>
    </nav>
  );
}
