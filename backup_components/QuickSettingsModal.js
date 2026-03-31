import styles from "../styles/quickSettingsModal.module.css";
import UpdateUser from "../pages/update-user";
import { useState } from "react";


export default function QuickSettingsModal({ action, onClose }) {

  const [closing, setClosing] = useState(false);

const handleClose = () => {
  setClosing(true);
  setTimeout(onClose, 200);
};


  const getUrl = () => {
    switch (action) {
      case "register":
        return "/register/";
      case "verify":
        return "/verify/";
      case "update":
        return <UpdateUser />;
      case "change-email":
        return "/change-email/";
      default:
        return "";
    }
  };
  

  return (
    <div className={styles.overlay} onClick={handleClose}>
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
