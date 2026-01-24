import { useState,useEffect } from "react";
import Sidebar from "../components/Sidebar";
import styles from "../styles/register.module.css";
import Layout from "../components/Layout";

export default function Register() {
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
  const [message, setMessage] = useState("");


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchMeta = async () => {
      try {
        const [hRes, cRes] = await Promise.all([
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/hostels/fetch/",
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/courses/fetch/",
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



  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Submitting...");



    try {
      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Registered! Please check your email for the code.");
      } else {
        setMessage("❌ " + data.error);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to register");
    }
  };

  return (
  

    <div className={styles.container}>
        <h1 className={styles.title}>Register User</h1>
      <div className={styles.formWrapper}>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* User Fields */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label>First Name</label>
              <input type="text" name="first_name" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Last Name</label>
              <input type="text" name="last_name" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Full Name</label>
              <input type="text" name="name" onChange={handleChange} required className={styles.input} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" name="email" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Mobile No.</label>
              <input type="text" name="phone" onChange={handleChange} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Alternate Mobile No.</label>
              <input type="text" name="mobile" onChange={handleChange} className={styles.input} />
            </div>
          </div>

         <div className={styles.row}>
            <div className={styles.field}>
            <input name="room_no" placeholder="Room No." onChange={handleChange} />
            </div>

            <div className={styles.field}>
            <select name="hostel_name" required onChange={handleChange}>
              <option value="">Select Hostel</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.name}>
                  {h.name}
                </option>
              ))}
            </select>
            </div>

            <div className={styles.field}>
            <select name="course" required onChange={handleChange}>
              <option value="">Select Course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            </div>
          </div>

            <div className={styles.field}>
              <select name="gender" onChange={handleChange}>
  <option value="">Gender</option>
  <option value="Male">Male</option>
  <option value="Female">Female</option>
  <option value="Other">Other</option>
</select>


            </div>
            <div className={styles.field}>
<select name="food_preference" onChange={handleChange}>
  <option value="">Food Preference</option>
  <option value="veg">Veg</option>
  <option value="nonveg">Non-Veg</option>
</select>
              </div>

          <div className={styles.field}>
            <label>Date of Joining</label>
            <input type="date" name="date_of_joining" onChange={handleChange} className={styles.input} />
          </div>

          {/* Parent Fields */}
          <h3 className={styles.subtitle}>Parent Details</h3>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Parent Name</label>
              <input type="text" name="parent_name" onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Parent Contact</label>
              <input type="text" name="parent_contact" onChange={handleChange} className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Parent Address</label>
              <input type="text" name="parent_address" onChange={handleChange} className={styles.input} />
            </div>
          </div>

          <button type="submit" className={styles.button}>
            Register
          </button>
        </form>

        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  );
}
