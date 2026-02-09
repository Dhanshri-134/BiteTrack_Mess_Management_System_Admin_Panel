import styles from "../styles/dashboard.module.css";

export default function Card({ title, value, extra }) {
  return (
    <div className={styles.card}>
      <h2>{title}</h2>

      <div className={styles.valueRow}>
        <span className={styles.msg}>{value}

        {extra && <span className={styles.cardExtra}>{extra}</span>}
        </span>
      </div>
    </div>
  );
}
