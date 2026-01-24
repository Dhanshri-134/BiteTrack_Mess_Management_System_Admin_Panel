
import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import BottomNav from "./Footer";
import styles from "../styles/layout.module.css";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.container}>
      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className={styles.body}>
        {sidebarOpen && (
          <Sidebar closeSidebar={() => setSidebarOpen(false)} />
        )}

        <main className={styles.main}>
          {children}
        </main>
         <BottomNav />
      </div>
    </div>
  );
}
