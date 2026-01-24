import styles from "../styles/quickSettingsModal.module.css";

export default function QuickSettingsModal({ action, onClose }) {
  const getUrl = () => {
    switch (action) {
      case "register":
        return "/register";
      case "verify":
        return "/verify";
      case "update":
        return "/update-user";
      case "change-email":
        return "/change-email";
      default:
        return "";
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <iframe
          src={getUrl()}
          title="Quick Settings Action"
          className={styles.iframe}
        />
      </div>
    </div>
  );
}
