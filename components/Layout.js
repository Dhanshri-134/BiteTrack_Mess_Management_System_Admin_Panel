import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import styles from "../styles/Layout.module.css";
import { useState } from "react";

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.container}>
      <Navbar />
      <div className={styles.body}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className={collapsed ? styles.mainCollapsed : styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
