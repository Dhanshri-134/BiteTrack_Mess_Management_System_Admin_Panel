import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import styles from "../../styles/settings.module.css";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import StaffHandling from "./staff_setting";
import { useLanguage } from "../../context/LanguageContext";
import { offlineFetch } from "@/lib/offlineFetch";
const SUPABASE_URL = "https://db.vhnhtypxvpwagghunnjr.supabase.co";

export default function SettingsPage() {
  const { t } = useLanguage();
  const [errorShown, setErrorShown] = useState(false);

  const [hostelText, setHostelText] = useState("");
  const [courseText, setCourseText] = useState("");


  const [loading, setLoading] = useState(true);
  const [mess, setMess] = useState({
    name: "",
    location: "",
    open_time: "",
    description: "",
    per_day_rate: "",
    monthly_price: "",
    allowed_leave_days: "",
    features: [],
    specialties: [],
    mess_images: [],
    logo: "",
    owner_photo: "",
    stamp_image: "",
    signature_image: "",
  });

  const [activeTab, setActiveTab] = useState("mess");

  const [hostels, setHostels] = useState([]);
  const [courses, setCourses] = useState([]);

  const [contact, setContact] = useState({
    contact_name: "",
    phone_number: "",
    email: "",
    address: "",
  });


  const [paymentConfig, setPaymentConfig] = useState({
  upi_id: "",
  receiver_name: "",
  is_active: true,
});




  // --------------------------------------------------
  // 🔵 Fetch settings
  // --------------------------------------------------
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error(t("unauthorized"));
      const data = await offlineFetch("settings-mess", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/settings/messInfo/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
      });

      setMess({
        ...data,
        features: data.features || [],
        specialties: data.specialties || [],
        mess_images: data.mess_images || [],
      });

      // fetch hostels & courses
      const metaData = await offlineFetch("settings-meta", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/mess/meta/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("meta fetch failed");
        return res.json();
      });
      setHostels(metaData.hostels || []);
      setCourses(metaData.courses || []);
      setHostelText((metaData.hostels || []).map(h => h.name).join(", "));
      setCourseText((metaData.courses || []).map(c => c.name).join(", "));



      // fetch owner contact
      const contactData = await offlineFetch("settings-contact", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/mess/mess-contact/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("contact fetch failed");
        return res.json();
      });

      setContact(
        contactData || {
          contact_name: "",
          phone_number: "",
          email: "",
          address: "",
        }
      );


      const paymentData = await offlineFetch("settings-payment-config", async () => {
  const res = await fetch(
    "https://bite-track-mess-management-system-a.vercel.app/api/payment/config/",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("payment config fetch failed");
  return res.json();
});

if (paymentData) {
  setPaymentConfig(paymentData);
}


    } catch (err) {
      console.error(err);
      if (!errorShown) {
        toast.error(t("failed_to_load_settings"));
        setErrorShown(true);
      }
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // --------------------------------------------------
  // 🟡 Field handler
  // --------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setMess((p) => ({ ...p, [name]: value }));
  };

  
  // --------------------------------------------------
  // 🟣 Upload with debug
  // --------------------------------------------------
  const uploadFile = async (file, bucket) => {
    const fileName = `${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  };

  const handleSingleImage = async (file, field, bucket) => {
    try {
      const url = await uploadFile(file, bucket);
      setMess((prev) => ({ ...prev, [field]: url }));
    } catch {
      toast.error(t("upload_failed"));
    }
  };

  const handleMultipleImages = async (files) => {
    try {
      const urls = [];
      for (const file of files) {
        urls.push(await uploadFile(file, "mess_images"));
      }
      setMess((p) => ({
        ...p,
        mess_images: [...(p.mess_images || []), ...urls],
      }));
    } catch {
      toast.error(t("upload_failed"));
    }
  };

  const removeImage = (field, index) => {
    setMess((p) => {
      if (field === "mess_images") {
        const copy = [...p.mess_images];
        copy.splice(index, 1);
        return { ...p, mess_images: copy };
      }

      // IMPORTANT: use empty string, NOT null
      return { ...p, [field]: "" };
    });
  };

  // --------------------------------------------------
  // 🟢 Save
  // --------------------------------------------------
  const saveSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized");

      // 1️⃣ Save mess basic info
      const messPayload = {
        name: mess.name,
        location: mess.location,
        open_time: mess.open_time,
        description: mess.description,
        per_day_rate: mess.per_day_rate,
        monthly_price: mess.monthly_price,
        allowed_leave_days: mess.allowed_leave_days,
        features: mess.features,
        specialties: mess.specialties,
        logo: mess.logo,
        owner_photo: mess.owner_photo,
        stamp_image: mess.stamp_image,
        signature_image: mess.signature_image,
        mess_images: mess.mess_images,
      };

      const messRes = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/settings/messInfo/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(messPayload),
        }
      );

      if (!messRes.ok) {
        const err = await messRes.json();
        throw new Error(err.message);
      }

      // 2️⃣ Save hostels & courses
      const metaRes = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/mess/meta/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ hostels, courses }),
        }
      );

      if (!metaRes.ok) {
        throw new Error("Failed to save hostels/courses");
      }

      // 3️⃣ Save owner contact
      const contactRes = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/mess/mess-contact/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(contact),
        }
      );

      if (!contactRes.ok) {
        throw new Error("Failed to save contact details");
      }


      // 4️⃣ Save payment config
const paymentRes = await fetch(
  "https://bite-track-mess-management-system-a.vercel.app/api/payment/config/",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(paymentConfig),
  }
);

if (!paymentRes.ok) {
  throw new Error("Failed to save payment config");
}


      toast.success(t("settings_updated"));
    } catch (err) {
      console.error(err);
      toast.error(t("update_failed"));
    }
  };


  // if (loading) return <Layout>{t("loading")}</Layout>;

  // --------------------------------------------------
  // 🧩 UI
  // --------------------------------------------------
  return (
    <Layout>
      <div className={styles.container}>
        <h1>{t("mess_settings")}</h1>

        <div className={styles.tabs}>
          {/* Sliding indicator */}
          <div
            className={`${styles.slider} ${activeTab === "staff" ? styles.right : ""
              }`}
          />

          <button
            className={`${styles.tab} ${activeTab === "mess" ? styles.active : ""
              }`}
            onClick={() => setActiveTab("mess")}
          >
            {t("mess_settings")}
          </button>

          <button
            className={`${styles.tab} ${activeTab === "staff" ? styles.active : ""
              }`}
            onClick={() => setActiveTab("staff")}
          >
            {t("staff_handling")}
          </button>
        </div>

        {activeTab === "mess" && (
          <>
            <div className={styles.group}>
              <label>{t("mess_name")}</label>
              <input name="name" value={mess.name || ""} onChange={handleChange} />

              <label>{t("location")}</label>
              <input name="location" value={mess.location || ""} onChange={handleChange} />

              <label>{t("open_time")}</label>
              <input name="open_time" value={mess.open_time || ""} onChange={handleChange} />

              <label>{t("description")}</label>
              <textarea name="description" value={mess.description || ""} onChange={handleChange} />

              <label>{t("features_comma")}</label>
              <input
                value={(mess.features || []).join(", ")}
                onChange={(e) =>
                  setMess({
                    ...mess,
                    features: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
              />

              <label>{t("specialties_comma")}</label>
              <input
                value={(mess.specialties || []).join(", ")}

                onChange={(e) =>
                  setMess({
                    ...mess,
                    specialties: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
              />
            </div>
            {/* ================= HOSTELS & COURSES ================= */}
            <div className={styles.group}>
              <h3>{t("hostels_and_courses")}</h3>

              <label>{t("hostels_comma")}</label>
              <input
                type="text"
                value={hostelText}
                placeholder="Boys Hostel A, Girls Hostel B"
                onChange={(e) => {
                  const text = e.target.value;
                  setHostelText(text);     // ← raw typing

                  setHostels(
                    text
                      .split(",")
                      .map(v => v.trim())
                      .filter(Boolean)
                      .map((name, i) => ({ name, display_order: i }))
                  );
                }}
              />


              <label>{t("courses_comma")}</label>
              <input
                type="text"
                value={courseText}
                placeholder="B.Tech, MBA, MCA"
                onChange={(e) => {
                  const text = e.target.value;
                  setCourseText(text);

                  setCourses(
                    text
                      .split(",")
                      .map(v => v.trim())
                      .filter(Boolean)
                      .map((name, i) => ({ name, display_order: i }))
                  );
                }}
              />

            </div>
            {/* ================= OWNER CONTACT ================= */}
            <div className={styles.group}>
              <h3>{t("owner_contact_details")}</h3>

              <label>{t("contact_name")}</label>
              <input
                value={contact.contact_name}
                onChange={(e) =>
                  setContact({ ...contact, contact_name: e.target.value })
                }
              />

              <label>{t("phone_number")}</label>
              <input
                value={contact.phone_number}
                onChange={(e) =>
                  setContact({ ...contact, phone_number: e.target.value })
                }
              />

              <label>{t("email")}</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) =>
                  setContact({ ...contact, email: e.target.value })
                }
              />

              <label>{t("address")}</label>
              <textarea
                value={contact.address}
                onChange={(e) =>
                  setContact({ ...contact, address: e.target.value })
                }
              />
            </div>


            {/* ================= UPI PAYMENT CONFIG ================= */}
<div className={styles.group}>
  <h3>UPI Payment Settings</h3>

  <label>UPI ID</label>
  <input
    value={paymentConfig.upi_id}
    placeholder="example@upi"
    onChange={(e) =>
      setPaymentConfig({ ...paymentConfig, upi_id: e.target.value })
    }
  />

  <label>Receiver Name</label>
  <input
    value={paymentConfig.receiver_name}
    placeholder="Mess Owner Name"
    onChange={(e) =>
      setPaymentConfig({ ...paymentConfig, receiver_name: e.target.value })
    }
  />


  {paymentConfig.qr_code_url && (
    <div style={{ position: "relative", display: "inline-block" }}>
      <img
        src={paymentConfig.qr_code_url}
        className={styles.preview}
      />
      <button
        onClick={() =>
          setPaymentConfig((p) => ({ ...p, qr_code_url: "" }))
        }
        className={styles.remove}
      >
        ✕
      </button>
    </div>
  )}

  <label>
    <input
      type="checkbox"
      checked={paymentConfig.is_active}
      onChange={(e) =>
        setPaymentConfig({
          ...paymentConfig,
          is_active: e.target.checked,
        })
      }
    />
    Enable UPI Payments
  </label>
</div>



            <div className={styles.group}>
              <label>{t("mess_logo")}</label>
              <input
                type="file"
                onChange={(e) =>
                  handleSingleImage(e.target.files[0], "logo", "mess-logo")
                }
              />
              {mess.logo && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={mess.logo} className={styles.preview} />
                  <button onClick={() => removeImage("logo")} className={styles.remove}>
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className={styles.group}>
              <label>{t("owner_photo")}</label>
              <input
                type="file"
                onChange={(e) =>
                  handleSingleImage(
                    e.target.files[0],
                    "owner_photo",
                    "mess-owner-photos"
                  )
                }
              />
              {mess.owner_photo && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={mess.owner_photo} className={styles.preview} />
                  <button onClick={() => removeImage("owner_photo")} className={styles.remove}>
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className={styles.group}>
              <label>{t("stamp_image")}</label>
              <input
                type="file"
                onChange={(e) =>
                  handleSingleImage(
                    e.target.files[0],
                    "stamp_image",
                    "mess-stamps"
                  )
                }
              />
              {mess.stamp_image && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={mess.stamp_image} className={styles.preview} />
                  <button onClick={() => removeImage("stamp_image")} className={styles.remove}>
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className={styles.group}>
              <label>{t("signature")}</label>
              <input
                type="file"
                onChange={(e) =>
                  handleSingleImage(
                    e.target.files[0],
                    "signature_image",
                    "mess-signature"
                  )
                }
              />
              {mess.signature_image && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={mess.signature_image} className={styles.preview} />
                  <button onClick={() => removeImage("signature_image")} className={styles.remove}>
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className={styles.group}>
              <label>{t("mess_images")}</label>
              <input type="file" multiple onChange={(e) => handleMultipleImages(e.target.files)} />
              <div className={styles.grid}>
                {mess.mess_images?.map((img, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={img} className={styles.preview} />
                    <button
                      onClick={() => removeImage("mess_images", i)}
                      className={styles.remove}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={saveSettings}>{t("save_changes")}</button>
          </>
        )}
        {activeTab === "staff" && <StaffHandling />}

      </div>
    </Layout>
  );
}



