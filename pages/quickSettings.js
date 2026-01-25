import Layout from "../components/Layout";
import styles from "../styles/quickSettings.module.css";
import { useRouter } from "next/router";
import { useLanguage } from "../context/LanguageContext";

export default function QuickSettings() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleAction = (action) => {
    switch (action) {
      case "register":
        router.push("/register"); // navigate to register page
        break;
      case "verify":
        router.push("/verify"); // navigate to verify page
        break;
      case "update":
        router.push("/update-user"); // navigate to users update page
        break;
      case "change-email":
        router.push("/change-email"); // new page
        break;
      default:
        break;
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>{t("quickActions")}</h1>

          <p className={styles.description}>
            {t("quickActionsDescription")}
          </p>

          <div className={styles.actionsGrid}>
            <div
              className={styles.actionCard}
              onClick={() => handleAction("register")}
            >
              <h2>{t("register")}</h2>
              <p>{t("registerDescription")}</p>
            </div>

            <div
              className={styles.actionCard}
              onClick={() => handleAction("verify")}
            >
              <h2>{t("verify")}</h2>
              <p>{t("verifyDescription")}</p>
            </div>

            <div
              className={styles.actionCard}
              onClick={() => handleAction("update")}
            >
              <h2>{t("update")}</h2>
              <p>{t("updateDescription")}</p>
            </div>

            <div
              className={styles.actionCard}
              onClick={() => handleAction("change-email")}
            >
              <h2>{t("changeEmail")}</h2>
              <p>{t("changeEmailDescription")}</p>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}

// import { useState } from "react";
// import Layout from "../components/Layout";
// import styles from "../styles/quickSettings.module.css";
// import { useLanguage } from "../context/LanguageContext";
// import QuickSettingsModal from "../components/QuickSettingsModal";

// export default function QuickSettings() {
//   const { t } = useLanguage();
//   const [action, setAction] = useState(null);

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <main className={styles.main}>
//           <h1 className={styles.title}>{t("quickActions")}</h1>
//           <p className={styles.description}>
//             {t("quickActionsDescription")}
//           </p>

//           <div className={styles.actionsGrid}>
//             <div
//               className={styles.actionCard}
//               onClick={() => setAction("register")}
//             >
//               <h2>{t("register")}</h2>
//               <p>{t("registerDescription")}</p>
//             </div>

//             <div
//               className={styles.actionCard}
//               onClick={() => setAction("verify")}
//             >
//               <h2>{t("verify")}</h2>
//               <p>{t("verifyDescription")}</p>
//             </div>

//             <div
//               className={styles.actionCard}
//               onClick={() => setAction("update")}
//             >
//               <h2>{t("update")}</h2>
//               <p>{t("updateDescription")}</p>
//             </div>

//             <div
//               className={styles.actionCard}
//               onClick={() => setAction("change-email")}
//             >
//               <h2>{t("changeEmail")}</h2>
//               <p>{t("changeEmailDescription")}</p>
//             </div>
//           </div>
//         </main>
//       </div>

//       {action && (
//         <QuickSettingsModal
//           action={action}
//           onClose={() => setAction(null)}
//         />
//       )}
//     </Layout>
//   );
// }
