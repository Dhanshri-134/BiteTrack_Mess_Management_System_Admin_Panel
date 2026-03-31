import styles from "../styles/GlobalLoader.module.css";

export default function GlobalLoader() {
  return (
    <div className={styles.overlay}>
      <div className={styles.spinner}></div>
    </div>
  );
}
