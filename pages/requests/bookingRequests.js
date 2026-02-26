import { useAppRefresh } from "@/lib/useAppRefresh";

import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/bookingRequests.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp } from "lucide-react";
import DayDropdown from "../../components/DayDropdown";
import { useLanguage } from "../../context/LanguageContext";

export default function bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [confirmData, setConfirmData] = useState(null);

  const statusOptions = [
  "all",
  "pending",
  "confirmed",
  "rejected",
  "completed",
];

  
  const { t } = useLanguage();

  // Format date properly (YYYY-MM-DD)
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toISOString().split("T")[0];
  };

  // Fetch function bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
      console.warn("Session expired! Please login again.");
      return;
    }
      const data = await offlineFetch("bookings-list", async () => {
      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/bookings/", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch bookings");
      return data;
      });
      setBookings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);


useAppRefresh(fetchBookings);


  const formatDateOnly = (date) => {
  if (!date) return "-";
  return new Date(date).toISOString().split("T")[0];
};

const openConfirmModal = (id, status) => {
  setConfirmData({ id, status });
};

//   const updateStatus = async (id, status) => {
//    setConfirmData({ id, status });

//     try {
//       const res = await fetch(`/api/bookings/${id}/`, {
//         method: "PATCH",
//         headers: { 
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${localStorage.getItem("token")}`
//         },
//         body: JSON.stringify({ status }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Failed to update booking");
//       toast.success(
//   status === "Confirmed"
//     ? t("bookingConfirmed")
//     : status === "Rejected"
//     ? t("bookingRejected")
//     : t("bookingCompleted")
// );

//   fetchBookings();

//     } catch (err) {
// console.log(err)
//       toast.error("Something went wrong. Please try again.");
//     }
//   };


  const filtered =
  filter === "all"
    ? bookings
    : bookings.filter(
        (b) => b.status.toLowerCase() === filter
      );

    const sortedFiltered = [...filtered].sort((a, b) => a.id - b.id);

    function MobileBookingCard({ booking, onStatusChange, t }) {
  const [open, setOpen] = useState(false);

  const status = booking.status;

  const statusOptions =
    status === "Pending"
      ? ["confirmed", "rejected"]
      : status === "Confirmed"
      ? ["completed"]
      : [];

  return (
    <div className={styles.bookingCard}>
        <span className={`${styles.statusBadge} ${styles[status.toLowerCase()]}`}>
          {t(status.toLowerCase())}
        </span>
      {/* HEADER */}
      <div className={styles.cardHeader}>
      <div>

          <strong></strong>
          <div className={styles.subText}>{booking.id}. {booking.name}</div>
      </div>
        

        <button
          className={styles.expandBtn}
          onClick={() => setOpen(!open)}
          aria-label="Toggle details"
        >
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>


      {/* DROPDOWN */}
      {open && (
        <div className={styles.details}>
          <div className={styles.grid}>
            <div><span>{t("mobile")}</span>{booking.mobile_no}</div>
            <div><span>{t("people")}</span>{booking.people_count}</div>
            <div><span>{t("menu")}</span>{booking.menu_preference}</div>
            <div><span>{t("date")}</span>{formatDateOnly(booking.function_date)}</div>
            <div><span>{t("address")}</span>{booking.address}</div>
            <div><span>{t("requestedAt")}</span>{formatDateOnly(booking.created_at)}</div>
           
          </div>

          {booking.notes && (
            <div className={styles.notes}>
              <strong>{t("notes")}:</strong> {booking.notes}
            </div>
          )}

          {/* ACTION BUTTONS */}
<div className={styles.cardActions}>
  {status === "Pending" && (
    <>
      <button
        className={styles.confirm}
        onClick={() => onStatusChange(booking.id, "Confirmed")}
      >
        {t("confirm")}
      </button>

      <button
        className={styles.reject}
        onClick={() => onStatusChange(booking.id, "Rejected")}
      >
        {t("reject")}
      </button>
    </>
  )}

  {status === "Confirmed" && (
    <button
      className={styles.complete}
      onClick={() => onStatusChange(booking.id, "Completed")}
    >
      {t("complete")}
    </button>
  )}
</div>

        </div>
      )}
    </div>
  );
}


const confirmStatusUpdate = async () => {
  if (!confirmData) return;

  const { id, status } = confirmData;

  try {
    const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/bookings/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update booking");

    toast.success(
      status === "Confirmed"
        ? t("bookingConfirmed")
        : status === "Rejected"
        ? t("bookingRejected")
        : t("bookingCompleted")
    );

    setConfirmData(null);
    fetchBookings();

  } catch (err) {
    console.log(err);
    toast.error("Something went wrong. Please try again.");
    setConfirmData(null);
  }
};

   return (
    <Layout>
      <div className={styles.container}>
        <h1>{t("functionBookings")}</h1>

        <div className={styles.controls}>
  <label>{t("filter")}:</label>
  <DayDropdown
    options={statusOptions}
    value={filter}
    onChange={setFilter}
  />
</div>


        {loading ? (
          <p>{t("loadingBookings")}</p>
        ) : (
          <>
            {/* ===== DESKTOP TABLE ===== */}
            <div className={styles.desktopOnly}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("id")}</th>
                    <th>{t("user")}</th>
                    <th>{t("mobile")}</th>
                    <th>{t("people")}</th>
                    <th>{t("menuPreference")}</th>
                    <th>{t("date")}</th>
                    <th>{t("status")}</th>
                    <th>{t("notes")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan="9">{t("noBookingsFound")}</td></tr>
                  ) : (
                    sortedFiltered.map(b => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.name}</td>
                        <td>{b.mobile_no}</td>
                        <td>{b.people_count}</td>
                        <td>{b.menu_preference}</td>
                        <td>{formatDate(b.function_date)}</td>
                        <td>
                          <span className={`${styles.status} ${styles[b.status.toLowerCase()]}`}>
                            {t(b.status.toLowerCase())}
                          </span>
                        </td>
                        <td>{b.notes || "-"}</td>
                        <td className={styles.actions}>
                          {b.status === "Pending" && (
                            <>
                              <button onClick={() => openConfirmModal(b.id, "Confirmed")} className={styles.confirm}>
                                {t("confirm")}
                              </button>
                              <button onClick={() => openConfirmModal(b.id, "Rejected")} className={styles.reject}>
                                {t("reject")}
                              </button>
                            </>
                          )}
                          {b.status === "Confirmed" && (
                            <button onClick={() => openConfirmModal(b.id, "Completed")} className={styles.complete}>
                              {t("complete")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ===== MOBILE CARDS ===== */}
            <div className={styles.mobileOnly}>
              {filtered.length === 0 ? (
                <p>{t("noBookingsFound")}</p>
              ) : (
                sortedFiltered.map((b) => (
  <MobileBookingCard
    key={b.id}
    booking={b}
    t={t}
    onStatusChange={openConfirmModal}
  />
))

              )}
            </div>
          </>
        )}

      </div>

      {confirmData && (
  <div className={styles.modalOverlay}>
    <div className={styles.modal}>
      <h3>
        {t("confirmAction")}
      </h3>

      <p>
        {t("areYouSure")}{" "}
        ?
      </p>

      <div className={styles.modalActions}>
        <button
          className={styles.cancelBtn}
          onClick={() => setConfirmData(null)}
        >
          {t("cancel")}
        </button>

        <button
          className={styles.confirmBtn}
          onClick={confirmStatusUpdate}
        >
          {t("yesProceed")}
        </button>
      </div>
    </div>
  </div>
)}
    </Layout>
  );
}
