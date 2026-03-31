import { useState, useEffect } from "react";
import styles from "../../styles/register.module.css";
import Layout from "../../components/Layout";
import toast from "react-hot-toast";
import { API_BASE } from "../../lib/api";
import { useLanguage } from "../../context/LanguageContext";

export default function Register() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    name: "",
    email: "",
    phone: "",
    mobile: "",
    room_no: "",
    hostel_name: "",
    course: "",
    date_of_joining: "",
    parent_name: "",
    parent_contact: "",
    parent_address: "",
  });

  const [hostels, setHostels] = useState([]);
  const [courses, setCourses] = useState([]);
  const [, setMessage] = useState("");


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchMeta = async () => {
      try {
        const [hRes, cRes] = await Promise.all([
          fetch(
            `${API_BASE}/api/hostels/fetch/`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${API_BASE}/api/courses/fetch/`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);

        setHostels(await hRes.json());
        setCourses(await cRes.json());
      } catch (err) {
        console.error("Failed to load hostels/courses", err);
      }
    };

    fetchMeta();
  }, []);

const getToken = () => localStorage.getItem("token");
  

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    toast(t("submitting"))



    try {

      const token = getToken();
      const res = await fetch(`${API_BASE}/api/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json",
           Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(form),
      });
      let data = {};
try {
  data = await res.json();
} catch {}
      if (res.ok) {
        toast.success("✅ Registered! Please check your email for the code.");
      } else {
        toast.error("❌ " + data.error);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to register");
    }
  };

  return (
<Layout>
    <div className={styles.container}>
      <h1 className={styles.title}>{t("registerUser")}</h1>
      <div className={styles.formWrapper}>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* User Fields */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label>{t("firstName")}</label>
              <input type="text" name="first_name" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>{t("lastName")}</label>
              <input type="text" name="last_name" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>{t("fullName")}</label>
              <input type="text" name="name" onChange={handleChange} required className={styles.input} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>{t("email")}</label>
              <input type="email" name="email" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>{t("mobile")}</label>
              <input type="text" name="phone" onChange={handleChange} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>{t("alternateMobile")}</label>
              <input type="text" name="mobile" onChange={handleChange} className={styles.input} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>{t("roomNo")}</label>
              <input name="room_no" onChange={handleChange} />
            </div>

            <div className={styles.field}>
              <label>{t("hostelName")}</label>
              <select name="hostel_name" required onChange={handleChange}>
                <option value="" ></option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.name} >
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>{t("courseName")}</label>
              <select name="course" required onChange={handleChange}>
                <option value=""></option>
                {courses.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>{t("gender")}</label>
            <select name="gender" onChange={handleChange}>
              <option value=""></option>
              <option value="Male">{t("male")}</option>
              <option value="Female">{t("female")}</option>
              <option value="Other">{t("other")}</option>
            </select>


          </div>
          <div className={styles.field}>
            <label>{t("foodPreference")}</label>
            <select name="food_preference" onChange={handleChange}>
              <option value=""></option>
              <option value="veg">{t("veg")}</option>
              <option value="nonveg">{t("nonVeg")}</option>
            </select>
          </div>

          <div className={styles.field}>
            <label>{t("dateOfJoining")}</label>
            <input type="date" name="date_of_joining" onChange={handleChange} className={styles.input} />
          </div>

          {/* Parent Fields */}
          <h3 className={styles.subtitle}>{t("parentDetails")}</h3>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>{t("parentName")}</label>
              <input type="text" name="parent_name" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>{t("parentContact")}</label>
              <input type="text" name="parent_contact" onChange={handleChange} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>{t("parentAddress")}</label>
              <input type="text" name="parent_address" onChange={handleChange} className={styles.input} />
            </div>
          </div>

          <button type="submit" className={styles.button}>
            {t("register")}
          </button>
        </form>

      </div>
    </div>
                </Layout>
  );
}
