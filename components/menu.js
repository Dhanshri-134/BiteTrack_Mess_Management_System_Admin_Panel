import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/menu.module.css";

export default function MenuPage() {
  const [menu, setMenu] = useState({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [ratings, setRatings] = useState({});
  const [votes, setVotes] = useState({});

  const defaultMenu = {
    Monday: { breakfast: "", lunch: "", dinner: "" },
    Tuesday: { breakfast: "", lunch: "", dinner: "" },
    Wednesday: { breakfast: "", lunch: "", dinner: "" },
    Thursday: { breakfast: "", lunch: "", dinner: "" },
    Friday: { breakfast: "", lunch: "", dinner: "" },
    Saturday: { breakfast: "", lunch: "", dinner: "" },
    Sunday: { breakfast: "", lunch: "", dinner: "" },
  };
  
  const weekDays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];


  // Fetch weekly menu
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu/fetch");
        const data = await res.json();
        if (res.ok && data?.menu) setMenu(data.menu);
        else setMenu(defaultMenu);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setMenu(defaultMenu);
      }
    };
    fetchMenu();
  }, []);

  // Fetch ratings
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const res = await fetch("/api/menu/ratings/fetch");
        const data = await res.json();
        if (res.ok) setRatings(data);
      } catch (err) {
        console.error("Error fetching ratings:", err);
      }
    };
    fetchRatings();
  }, []);

  // Fetch votes
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const res = await fetch("/api/menu/votes/fetch");
        const data = await res.json();
        if (res.ok) setVotes(data);
      } catch (err) {
        console.error("Error fetching votes:", err);
      }
    };
    fetchVotes();
  }, []);

  // Update selected day
  useEffect(() => {
    if (menu[selectedDay]) {
      setBreakfast(menu[selectedDay].breakfast || "");
      setLunch(menu[selectedDay].lunch || "");
      setDinner(menu[selectedDay].dinner || "");
    }
  }, [selectedDay, menu]);

  // Save updates
  const handleSave = async () => {
    const updatedMenu = {
      ...menu,
      [selectedDay]: { breakfast, lunch, dinner },
    };

    setMenu(updatedMenu);

    const res = await fetch("/api/menu/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu: updatedMenu }),
    });

    const data = await res.json();
    alert(data.message || "Menu update complete!");
  };

  const renderStars = (avg) => {
    const rounded = Math.round(avg);
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.heading}>🍽️ Menu Management</h1>

        <div className={styles.formCard}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Select Day</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={styles.selectField}
              >
                {Object.keys(defaultMenu).map((day) => (
                  <option key={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Breakfast</label>
              <input
                type="text"
                
                value={breakfast}
                onChange={(e) => setBreakfast(e.target.value)}
                className={styles.inputField}
              />
            </div>
            <div className={styles.field}>
              <label>Lunch</label>
              <input
                type="text"
                value={lunch}
                onChange={(e) => setLunch(e.target.value)}
                className={styles.inputField}
              />
            </div>
            <div className={styles.field}>
              <label>Dinner</label>
              <input
                type="text"
                value={dinner}
                onChange={(e) => setDinner(e.target.value)}
                className={styles.inputField}
              />
            </div>
          </div>

          <button onClick={handleSave} className={styles.saveButton}>
            Save Menu
          </button>
        </div>

        {/* Ratings Display */}
        <h2 className={styles.subHeading}>⭐ Daily Ratings Overview</h2>
        <div className={styles.ratingsBox}>
          {Object.keys(defaultMenu).map((day) => (
            <div key={day} className={styles.ratingRow}>
              <span>{day}</span>
              <span>
                {ratings[day]
                  ? `${renderStars(ratings[day].average)} (${ratings[day].average.toFixed(1)})`
                  : "No Ratings Yet"}
              </span>
            </div>
          ))}
        </div>

        {/* Sunday Specials */}
        <h2 className={styles.subHeading}>🍛 Sunday Dinner Specials</h2>
        <div className={styles.specialSection}>
          {votes?.specials ? (
            votes.specials.map((dish, i) => (
              <div key={i} className={styles.voteRow}>
                <strong>{dish.dish_name}</strong> ({dish.is_veg ? "Veg" : "Non-Veg"})
                <div className={styles.voteBarWrapper}>
                  <div
                    className={styles.voteBar}
                    style={{ width: `${dish.percentage}%` }}
                  />
                  <span className={styles.votePercent}>{dish.percentage}%</span>
                </div>
              </div>
            ))
          ) : (
            <p>No votes yet for Sunday specials.</p>
          )}
        </div>

        {/* Weekly Menu Preview */}
        <h2 className={styles.subHeading}>📆 Weekly Menu Preview</h2>
        <div className={styles.menuPreview}>
  {weekDays.map((day) => {
    const meals = menu[day] || { breakfast: "", lunch: "", dinner: "" };
    return (
      <div key={day} className={styles.dayBlock}>
        <h3 className={styles.dayName}>{day}</h3>
        <p className={styles.mealText}>🍳 {meals.breakfast || "—"}</p>
        <p className={styles.mealText}>🍛 {meals.lunch || "—"}</p>
        <p className={styles.mealText}>🍲 {meals.dinner || "—"}</p>
      </div>
    );
  })}
</div>
      </div>
    </Layout>
  );
}
