import styles from "../styles/dashboard.module.css";

export default function Card({ title, value, extra }) {
  return (
    <div className={styles.card}>
      
      <h2>{title}</h2>
      <p className={styles.msg}>{value}
        {extra && <div className={styles.cardExtra}>{extra}</div>}

      </p>
    </div>
  );
}
