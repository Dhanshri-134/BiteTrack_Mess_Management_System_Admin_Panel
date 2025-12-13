import Link from "next/link";
import Image from "next/image";
import styles from "../styles/splash.module.css";

export default function Splash() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
         <div className={styles.logo}>
          <Image
            src="/Assets/logo_Bite_Track.png" 
            alt="BiteTrack Logo"
            width={100}
            height={100}
            className={styles.logoImage}
          />
          </div>
        <h1 className={styles.logo}></h1>
      </header>

      <main className={styles.main}>
        <h2 className={styles.title}>Smart Mess Management</h2>
        <p className={styles.subtitle}>
          Manage attendance, billing, and members with ease.
        </p>
        <Link href="/login" className={styles.ctaBtn}>
          Get Started
        </Link>
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} BiteTrack. All rights reserved. Powered by ShrisTech</p>
      </footer>
    </div>
  );
}
