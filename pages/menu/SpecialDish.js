import { useEffect, useState } from "react";
import styles from "../../styles/specialdish.module.css";

export default function SpecialDish() {
  const [specials, setSpecials] = useState([]);
  const [newDish, setNewDish] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cravings, setCravings] = useState([]);


  useEffect(() => {
    fetchSpecials();
    fetchCravings();
  }, []);
const fetchSpecials = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Session expired. Please login again.");
    return (window.location.href = "/login");
  }

  try {
    const res = await fetch("/api/menu/special_dishes/fetch", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      return (window.location.href = "/login");
    }

    const data = await res.json();
    setSpecials(data);

  } catch (err) {
    console.error("Error fetching specials:", err);
  } finally {
    setLoading(false);
  }
};
async function fetchCravings() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Session expired. Please login again.");
    return (window.location.href = "/login");
  }

  try {
    const res = await fetch("/api/menu/cravings/fetch", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      return (window.location.href = "/login");
    }

    const data = await res.json();
    const normalized = normalizeCravings(data);
    setCravings(normalized);

  } catch (err) {
    console.error("Error fetching cravings:", err);
  } finally {
    setLoading(false);
  }
}

  function normalizeCravings(data) {
    const simplified = data.map((c) => ({
      ...c,
      text: c.craving_text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "")
    }));

    // group similar ones using a fuzzy match approach
    const groups = {};
    for (const item of simplified) {
      const key = Object.keys(groups).find(
        (existing) => similarity(existing, item.text) > 0.8
      );
      if (key) {
        groups[key].push(item);
      } else {
        groups[item.text] = [item];
      }
    }

    return Object.entries(groups).map(([text, list]) => ({
      craving: text,
      count: list.length
    }));
  }

  function similarity(a, b) {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    return (
      (longerLength - editDistance(longer, shorter)) /
      parseFloat(longerLength)
    );
  }

  function editDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }


  const addDish = async () => {
    if (!newDish.trim()) return;
    try {
      const res = await fetch("/api/menu/special_dishes/add", {
        method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ dish_name: newDish, is_veg: isVeg })
    });
      if (res.ok) {
        setNewDish("");
        fetchSpecials();
      }

       if (res.status === 401) {
      alert("Session expired. Please login again.");
      return (window.location.href = "/login");
    }
    } catch (err) {
      console.error("Error adding dish:", err);
    }
  };

  const deleteDish = async (id) => {
    if (!confirm("Are you sure you want to delete this dish?")) return;
    const token = localStorage.getItem("token");
  if (!token) {
    alert("Session expired. Please login again.");
    return (window.location.href = "/login");
  }

  try {
    const res = await fetch("/api/menu/special_dishes/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });

    if (res.status === 401) {
      alert("Session expired. Please login again.");
      return (window.location.href = "/login");
    }

    if (res.ok) {
      setSpecials((prev) => prev.filter((dish) => dish.id !== id));
    }
    } catch (err) {
      console.error("Error deleting dish:", err);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>🍛 Sunday Special Dishes</h2>
      <p className={styles.subtext}>
        Add or view the special dishes available for this Sunday.
      </p>

      <div className={styles.addSection}>
        <input
          type="text"
          value={newDish}
          onChange={(e) => setNewDish(e.target.value)}
          placeholder="Enter dish name..."
          className={styles.input}
        />
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={isVeg}
            onChange={(e) => setIsVeg(e.target.checked)}
          />
          Veg
        </label>
        <button onClick={addDish} className={styles.addBtn}>
          Add Dish
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading dishes...</p>
      ) : specials.length === 0 ? (
        <p className={styles.noData}>No special dishes added yet.</p>
      ) : (
        <div className={styles.grid}>
          {specials.map((dish) => (
            <div
              key={dish.id}
              className={`${styles.card} ${
                dish.is_veg ? styles.veg : styles.nonVeg
              }`}
            >
              <div className={styles.cardContent}>
                <div>
                  <h3 className={styles.dishName}>{dish.dish_name}</h3>
                  <p className={styles.voteCount}>⭐ {dish.votes ?? 0} votes</p>
                </div>
                <div className={styles.tagBlock}>
                <span className={`${styles.tag} ${dish.is_veg ? styles.veg : styles.nonVeg}`}>
                  {dish.is_veg ? "Veg" : "Non-Veg"}
                </span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteDish(dish.id)}
                  title="Delete Dish"
                >
                  🗑 
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.cravingsSection}>
            <h3>User Cravings</h3>
            {cravings.length ? (
              <ul className={styles.cravingsList}>
                {cravings.map((c, i) => (
                  <li key={i}>
                    🍽 <strong>{c.craving}</strong> — {c.count} requests
                  </li>
                ))}
              </ul>
            ) : (
              <p>No cravings recorded yet.</p>
            )}
          </div>
    </div>
  );
}
