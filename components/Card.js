import styles from "../styles/dashboard.module.css";

export default function Card({ title, value }) {
  return (
    <div className={styles.card}>
      <h2>{title}</h2>
      <p>{value}</p>
    </div>
  );
}
