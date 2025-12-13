



// import { useEffect, useState } from "react";
// import Layout from "../components/Layout";
// import Sidebar from "../components/Sidebar";
// import styles from "../styles/settings.module.css";
// import useAuth from "../hooks/useAuth";
// import { supabase } from "../lib/supabase"; // supabase client

// export default function Settings() {
//   useAuth();

//   const [mess, setMess] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("");

//   const fetchSettings = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Unauthorized");

//       const res = await fetch("/api/settings/messInfo", {
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${token}`
//         },
//       });

//       if (!res.ok) throw new Error("Unauthorized");
//       const data = await res.json();
//       setMess(data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setMess(prev => ({ ...prev, [name]: value }));
//   };

//   // ---------------- Upload image to bucket ----------------
//   const handleImageUpload = async (e, key, bucket) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("bucket", bucket);

//     try {
//       const res = await fetch("/api/settings/upload", { method: "POST", body: formData });
//       const data = await res.json();
//       if (data.ok) setMess(prev => ({ ...prev, [key]: data.url }));
//     } catch (err) {
//       console.error("Upload failed:", err);
//     }
//   };


//   const updateSettings = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const payload = { ...mess };
//       delete payload.id;
//       delete payload.email;
//       delete payload.password;
//       delete payload.prefix;

//       const res = await fetch("/api/settings/messInfo", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${token}`
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (data.ok) setMessage("✅ Settings updated successfully!");
//       else setMessage("❌ Failed to update settings");
//     } catch (err) {
//       console.error(err);
//       setMessage("❌ Failed to update settings");
//     }
//   };

//   useEffect(() => {
//     fetchSettings();
//   }, []);

//   if (loading) return <p>Loading...</p>;

//   return (
//     <Layout>
//       <div className={styles.container}>
//         <Sidebar />
//         <main className={styles.main}>
//           <h1 className={styles.title}>Mess Settings</h1>
//           {message && <p className={styles.message}>{message}</p>}

//           <form className={styles.formWrapper} onSubmit={e => { e.preventDefault(); updateSettings(); }}>

//             {/* Simple text inputs */}
//             {["name", "per_day_rate", "description", "location", "open_time"].map(key => (
//               <div key={key} className={styles.field}>
//                 <label>{key}</label>
//                 <input type="text" name={key} value={mess[key] || ""} onChange={handleChange} className={styles.input} />
//               </div>
//             ))}

//             {/* JSON fields */}
//             {["privacy_policy", "terms_conditions", "contact_info", "features", "specialties", "mess_images"].map(key => (
//               <div key={key} className={styles.field}>
//                 <label>{key}</label>
//                 {key === "mess_images" ? (
//                   <>
//                     <input type="file" onChange={e => handleImageUpload(e, key)} />
//                     {mess[key] && <img src={mess[key]} alt={key} style={{ width: "150px", marginTop: "0.5rem" }} />}
//                   </>
//                 ) : (
//                   <textarea name={key} value={JSON.stringify(mess[key] || {}, null, 2)} onChange={handleChange} className={styles.input}></textarea>
//                 )}
//               </div>
//             ))}

//             {/* Logo and Owner Photo */}
//             <div className={styles.field}>
//               <label>Logo</label>
//               <input type="file" onChange={e => handleImageUpload(e, "logo", "mess-logo")} />
//               {mess.logo && <img src={mess.logo} alt="Logo" style={{ width: "150px" }} />}
//             </div>

//             <div className={styles.field}>
//               <label>Owner Photo</label>
//               <input type="file" onChange={e => handleImageUpload(e, "owner_photo", "mess-owner-photos")} />
//               {mess.owner_photo && <img src={mess.owner_photo} alt="Owner" style={{ width: "150px" }} />}
//             </div>

//             <div className={styles.field}>
//               <label>Stamp</label>
//               <input type="file" onChange={e => handleImageUpload(e, "stamp_image", "mess-stamps")} />
//               {mess.stamp_image && <img src={mess.stamp_image} alt="Stamp" style={{ width: "150px" }} />}
//             </div>

//             <div className={styles.field}>
//               <label>Signature</label>
//               <input type="file" onChange={e => handleImageUpload(e, "signature_image", "mess-signature")} />
//               {mess.signature_image && <img src={mess.signature_image} alt="Signature" style={{ width: "150px" }} />}
//             </div>

//             <div className={styles.field}>
//               <label>Mess Images</label>
//               <input type="file" multiple onChange={async (e) => {
//                 const files = Array.from(e.target.files);
//                 for (let f of files) {
//                   await handleImageUpload({ target: { files: [f] } }, "mess_images", "mess-images");
//                 }
//               }} />
//               {mess.mess_images?.map((img, idx) => <img key={idx} src={img} alt={`Mess ${idx}`} style={{ width: "150px", marginRight: "0.5rem" }} />)}
//             </div>


//             <button type="submit" className={styles.button}>Update Settings</button>
//           </form>
//         </main>
//       </div>
//     </Layout>
//   );
// }







import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import styles from "../styles/settings.module.css";
import { supabase } from "../lib/supabase";

export default function Settings() {
  const [mess, setMess] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Fetch settings
  const fetchSettings = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setMessage("Unauthorized");

    const res = await fetch("/api/settings/messInfo", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return setMessage("Unauthorized");

    const data = await res.json();
    setMess(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMess((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (files, field, bucket) => {
    if (!files.length) return;

    const urls = [];
    for (let file of files) {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) return alert(error.message);

      urls.push(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`
      );
    }

    setMess((prev) => ({
      ...prev,
      [field]: field === "mess_images" ? [...(prev[field] || []), ...urls] : urls[0],
    }));
  };

  const updateSettings = async () => {

    const token = localStorage.getItem("token");

    mess.features = Array.isArray(mess.features) ? mess.features : [];
  mess.specialties = Array.isArray(mess.specialties) ? mess.specialties : [];
  mess.mess_images = Array.isArray(mess.mess_images) ? mess.mess_images : [];

    const res = await fetch("/api/settings/messInfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(mess),
    });
    const data = await res.json();
    setMessage(data.ok ? "✅ Updated!" : "❌ Failed to update");
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Layout>
      <div className={styles.container}>
        <Sidebar />
        <main className={styles.main}>
          <h1 className={styles.title}>Mess Settings</h1>
          {message && <p className={styles.message}>{message}</p>}

          {/* Cards Layout */}
          <div className={styles.cardsContainer}>
            {/* Basic Info Card */}
            <div className={styles.card}>
              <h2>Basic Info</h2>
              <input placeholder="Name" name="name" value={mess.name || ""} onChange={handleChange} />
              <input placeholder="Location" name="location" value={mess.location || ""} onChange={handleChange} />
              <input placeholder="Open Time" name="open_time" value={mess.open_time || ""} onChange={handleChange} />
              <textarea placeholder="Description" name="description" value={mess.description || ""} onChange={handleChange} />
            </div>

            {/* Features & Rules Card */}
            <div className={styles.card}>
              <h2>Features & Rules</h2>
              <textarea
                placeholder="Features (comma separated)"
                value={Array.isArray(mess.features) ? mess.features.join(", ") : ""}
                onChange={(e) =>
                  setMess({ ...mess, features: e.target.value.split(",").map((f) => f.trim()) })
                }
              />
              <textarea placeholder="Rules & Regulations" name="rules" value={mess.rules || ""} onChange={handleChange} />
            </div>

            {/* Policies & Terms Card */}
            <div className={styles.card}>
              <h2>Policies & Terms</h2>
              <textarea
                placeholder="Privacy Policy (JSON)"
                value={JSON.stringify(mess.privacy_policy || {}, null, 2)}
                onChange={(e) => setMess({ ...mess, privacy_policy: JSON.parse(e.target.value) })}
              />
              <textarea
                placeholder="Terms & Conditions (JSON)"
                value={JSON.stringify(mess.terms_conditions || {}, null, 2)}
                onChange={(e) => setMess({ ...mess, terms_conditions: JSON.parse(e.target.value) })}
              />
            </div>

            {/* Media Upload Card */}
<div className={`${styles.card} ${styles.fullWidthCard}`}>
  <h2>Media Uploads</h2>

  {[
    { label: "Logo", field: "logo", bucket: "mess-logo" },
    { label: "Owner Photo", field: "owner_photo", bucket: "mess-owner-photos" },
    { label: "Stamp", field: "stamp_image", bucket: "mess-stamps" },
    { label: "Signature", field: "signature_image", bucket: "mess-signature" },
  ].map(({ label, field, bucket }) => (
    <div key={field} className={styles.uploadRow}>
      <div className={styles.uploadLeft}>
        <label className={styles.uploadLabel}>{label}</label>
        <input
          type="file"
          onChange={(e) => handleFileUpload(e.target.files, field, bucket)}
        />
      </div>
      <div className={styles.uploadRight}>
        {mess[field] && <img src={mess[field]} className={styles.preview} />}
      </div>
    </div>
  ))}

  {/* Multiple Mess Images */}
            <div className={styles.uploadRow}>
              <div className={styles.uploadLeft}>
                <label className={styles.uploadLabel}>Mess Images</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files, "mess_images", "mess_images")}
                />
              </div>
              <div className={styles.uploadRight}>
                <div className={styles.imagesPreview}>
                  {mess.mess_images?.map((img, i) => (
                    <img key={i} src={img} alt="mess" className={styles.preview} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>

          <button className={styles.saveButton} onClick={updateSettings}>
            Save Changes
          </button>
        </main>
      </div>
    </Layout>
  );
}
