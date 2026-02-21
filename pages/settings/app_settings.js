import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/AppSettings.module.css";

import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { Eye, EyeClosedIcon } from "lucide-react";
import { offlineFetch } from "../../lib/offlineFetch";
import { useAppRefresh } from "@/lib/useAppRefresh";



function decodeToken(token) {
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}



export default function AppSettingsPage() {
  
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState({});
  const [supportModal, setSupportModal] = useState(false);

  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const [credModal, setCredModal] = useState(false);
  const [credForm, setCredForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    newEmail: "",
  });
  
  
  const [viewCredLoading, setViewCredLoading] = useState(false);
  const [viewCredData, setViewCredData] = useState(null);

  const [viewCredModal, setViewCredModal] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [plainPassword] = useState("••••••••");
  
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [policyModal, setPolicyModal] = useState({
    open: false,
    data: null,
  });
  
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const [role, setRole] = useState(null);
    
    useEffect(() => {
      if (!token) return;
      const decoded = decodeToken(token);
      if (decoded?.role) {
        setRole(decoded.role);
      }
    }, [token]);
    
    /* -------------------- LOAD PROFILE -------------------- */
    useEffect(() => {
      if (!token) return;
      
    const loadProfile = async () => {
      try {
        const data = await offlineFetch("profile", async () => {
          const res = await fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/mess/profile/",
            {
              headers: {
                "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (!res.ok) throw new Error("Profile load failed");
        return res.json();
      });
        setProfile(data);
      } catch {
        toast.error(t("profile_load_failed"));
      }
    };

    loadProfile();
  }, [token, t]);
  
  /* -------------------- LOAD APP SETTINGS -------------------- */
  useEffect(() => {
    if (!token) return;
    
    const loadSettings = async () => {
      try {
        const data = await offlineFetch("app_settings", async () => {
          const res = await fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/settings/app/",
            {
              headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Settings load failed");
        return res.json();
      });
        setSettings(data?.data || {});
      } catch {
        toast.error(t("settings_load_failed"));
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [token, t]);
  

  
  return (
    <Layout title={t("app_settings")}>
      <div className={styles.container}>
        {/* ---------------- PROFILE HEADER ---------------- */}
        <div className={styles.profileHeader}>
          <img
            src={profile?.owner_photo || "/Assets/logo_Bite_Track.png"}
            alt={t("profile")}
          />
          <div>
            <h2>{profile?.name || t("my_mess")}</h2>
            <p>{profile?.email}</p>
          </div>
        </div>

        {/* ---------------- ACCOUNT ---------------- */}
{role !== "STAFF" && (
  <Section title={t("account_profile")}>
    <Item
      title={t("change_credentials")}
      onClick={() => setCredModal(true)}
    />
  </Section>
)}


        {/* ---------------- LEGAL ---------------- */}
        <Section title={t("legal")}>
          <Item
            title={t("privacy_policy")}
            onClick={() => openPolicy(settings.privacy_policy, setPolicyModal)}
          />
          <Item
            title={t("terms_conditions")}
            onClick={() =>
              openPolicy(settings.terms_conditions, setPolicyModal)
            }
          />
          <Item
            title={t("account_deletion_policy")}
            onClick={() =>
              openPolicy(settings.account_deletion, setPolicyModal)
            }
          />
        </Section>

        {/* ---------------- APP ---------------- */}
        <Section title={t("app")}>
          <Item
            title={t("about_bitetrack")}
            onClick={() =>
              openPolicy(settings.about_bitetrack, setPolicyModal)
            }
          />
        </Section>

        {/* ---------------- SUPPORT ---------------- */}
        <Section title={t("support")}>
          <Item
            title={t("contact_support")}
            onClick={() => setSupportModal(true)}
          />
        </Section>

        {/* ---------------- DANGER ZONE ---------------- */}
        <Section title={t("danger_zone")} danger>
          <div>

          <button
            className={styles.deleteBtn}
            onClick={() => setDeleteModal(true)}
            >
            {t("request_account_deletion")}
          </button>
            </div>
        </Section>
      </div>
      {deleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.closeBtn}
              onClick={() => setDeleteModal(false)}
              disabled={deleteLoading}
            >
              ✕
            </button>

            <h2 className={styles.dangerTitle}>
              {t("account_deletion")}
            </h2>

            <div className={styles.modalBody}>
              <p style={{ color: "#b91c1c", fontWeight: 500 }}>
                ⚠️ {t("deletion_warning")}
                <br />
                {t("deletion_warning_sub")}
              </p>

              <textarea
                placeholder={t("deletion_reason_placeholder")}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={4}
              />

              <button
                className={styles.deleteBtn}
                disabled={deleteLoading}
                onClick={async () => {
                  try {
                    setDeleteLoading(true);

                    const res = await fetch(
                      "https://bite-track-mess-management-system-a.vercel.app/api/settings/delete-account-request/",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          reason: deleteReason,
                        }),
                      }
                    );

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message);

                    toast.success(t("deletion_request_success"));

                    setDeleteModal(false);
                    setDeleteReason("");
                  } catch (e) {
                    toast.error(e.message || t("deletion_request_failed"));
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
              >
                {deleteLoading
                  ? t("submitting")
                  : t("confirm_deletion_request")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POLICY MODAL ================= */}
      {policyModal.open && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.closeBtn}
              onClick={() => setPolicyModal({ open: false, data: null })}
            >
              ✕
            </button>

            <h2>{policyModal.data?.title}</h2>

            <div className={styles.modalBody}>
              {(policyModal.data?.sections || []).map((s, i) => (
                <div key={i}>
                  <h4>{s.title}</h4>
                  <p>{s.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {supportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.closeBtn}
              onClick={() => setSupportModal(false)}
            >
              ✕
            </button>

            <h2>{t("contact_support")}</h2>

            <div className={styles.modalBody}>
              {settings?.contact_support?.email && (
                <p>
                  📧 {t("email")}:{" "}
                  
                  <a
                    href={`mailto:${settings.contact_support.email}`}
                    className={styles.link}
                  >
                    {settings.contact_support.email}
                  </a>
                </p>
              )}

              {settings?.contact_support?.contact_no && (
                <p>
                  📞 {t("phone")}:{" "}
                  <a
                    href={`tel:${settings.contact_support.contact_no}`}
                    className={styles.link}
                  >
                    {settings.contact_support.contact_no}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {viewCredModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.closeBtn}
              onClick={() => {
                setViewCredModal(false);
                setViewCredData(null);
              }}
            >
              ✕
            </button>

            <h2>{t("view_credentials")}</h2>

            {viewCredLoading ? (
              <p>{t("loading_credentials")}</p>
            ) : viewCredData ? (
              <div className={styles.credBox}>
                <p>
                  <strong>{t("email")}:</strong>{" "}
                  {viewCredData.username}
                </p>

                <p
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <strong>{t("password")}:</strong>
                  <span>
                    {showPwd
                      ? viewCredData.password
                      : "••••••••"}
                  </span>

                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPwd((p) => !p)}
                  >
                    {showPwd ? <Eye /> : "👁"}
                  </button>
                </p>
              </div>
            ) : (
              <p>{t("credentials_load_failed")}</p>
            )}
          </div>
        </div>
      )}
      {credModal && role !== "STAFF" &&  (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.closeBtn}
              onClick={() => setCredModal(false)}
            >
              ✕
            </button>

            <h2>{t("change_credentials")}</h2>

            <div className={styles.modalBody}>
              <input
                type="password"
                placeholder={t("old_password")}
                value={credForm.oldPassword}
                onChange={(e) =>
                  setCredForm({ ...credForm, oldPassword: e.target.value })
                }
              />

              <input
                type="email"
                placeholder={t("new_email_optional")}
                value={credForm.newEmail}
                onChange={(e) =>
                  setCredForm({ ...credForm, newEmail: e.target.value })
                }
              />

             <div className={styles.passwordWrapper}>
  <input
    type={showNewPwd ? "text" : "password"}
    placeholder={t("new_password")}
    value={credForm.newPassword}
    onChange={(e) =>
      setCredForm({ ...credForm, newPassword: e.target.value })
    }
  />

  <button
    type="button"
    className={styles.eyeBtn}
    onClick={() => setShowNewPwd((p) => !p)}
  >
    {showNewPwd ? <EyeClosedIcon/> : <Eye/>}
  </button>
</div>


              <div className={styles.passwordWrapper}>
  <input
    type={showConfirmPwd ? "text" : "password"}
    placeholder={t("confirm_password")}
    value={credForm.confirmPassword}
    onChange={(e) =>
      setCredForm({ ...credForm, confirmPassword: e.target.value })
    }
  />

  <button
    type="button"
    className={styles.eyeBtn}
    onClick={() => setShowConfirmPwd((p) => !p)}
  >
    {showConfirmPwd ? <EyeClosedIcon/> : <Eye/>}
  </button>
</div>



              <button
                className={styles.primaryBtn}
                onClick={async () => {
                  try {
                   if (!credForm.oldPassword || !credForm.newPassword || !credForm.confirmPassword) {
  return toast.error(t("all_password_fields_required"));
}

if (credForm.newPassword !== credForm.confirmPassword) {
  return toast.error(t("passwords_do_not_match"));
}


                    const res = await fetch(
                      "https://bite-track-mess-management-system-a.vercel.app/api/settings/change-credentials-request/",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
  oldPassword: credForm.oldPassword,
  newPassword: credForm.newPassword,
  newEmail: credForm.newEmail,
}),

                      }
                    );

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message);

                    toast.success(
                      t("credentials_updated_successfully")
                    );
                    setCredModal(false);
                    setCredForm({
                      oldPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                      newEmail: "",
                    });
                  } catch (e) {
                    toast.error(e.message || t("update_failed"));
                  }
                }}
              >
                {t("update")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
/* ---------------- UI HELPERS ---------------- */

function Section({ title, children, danger }) {
  return (
    <div className={styles.section}>
      <h3 className={danger ? styles.dangerTitle : ""}>{title}</h3>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

function Item({ title, subtitle, onClick }) {
  return (
    <div
      className={styles.item}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div>
        <span>{title}</span>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <span className={styles.arrow}>›</span>
    </div>
  );
}
/* ---------------- OPEN POLICY MODAL ---------------- */

function openPolicy(data, setPolicyModal) {
  if (!data) return toast.error("Content not available");

  setPolicyModal({
    open: true,
    data,
  });
}
