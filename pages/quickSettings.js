import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import styles from "../styles/quicksettings.module.css";
import { useRouter } from "next/router";

export default function QuickSettings() {
  const router = useRouter();

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
        <Sidebar /> {/* Keep your sidebar here */}
        <main className={styles.main}>
          <h1 className={styles.title}>Quick Actions</h1>

          <p className={styles.description}>
            Perform common actions quickly without navigating through menus.
          </p>

          <div className={styles.actionsGrid}>
            <div
              className={styles.actionCard}
              onClick={() => handleAction("register")}
            >
              <h2>Register</h2>
              <p>Add a new user to the system quickly.</p>
            </div>

            <div
              className={styles.actionCard}
              onClick={() => handleAction("verify")}
            >
              <h2>Verify</h2>
              <p>Verify pending users and activate their accounts.</p>
            </div>

            <div
              className={styles.actionCard}
              onClick={() => handleAction("update")}
            >
              <h2>Update</h2>
              <p>Update user information and parent details quickly.</p>
            </div>
            <div
  className={styles.actionCard}
  onClick={() => handleAction("change-email")}
>
  <h2>Change Email</h2>
  <p>Update user's email and reset verification status.</p>
</div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
