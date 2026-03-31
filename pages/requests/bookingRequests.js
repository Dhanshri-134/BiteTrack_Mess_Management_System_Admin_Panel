import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import DayDropdown from "../../components/DayDropdown";
import { useLanguage } from "../../context/LanguageContext";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { offlineFetch } from "../../lib/offlineFetch";
import { API_BASE } from "../../lib/api";
import styles from "../../styles/bookingRequests.module.css";


const formatDate = (dateString) => {
  if (!dateString) return "-";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toISOString().split("T")[0];
};

function getActionButtons(booking) {
  if (booking.status === "Pending") {
    return ["Confirmed", "Rejected"];
  }

  if (booking.status === "Confirmed") {
    return ["Completed"];
  }

  return [];
}

function MobileBookingCard({ booking, onStatusChange, t }) {
  const [open, setOpen] = useState(false);
  const actions = getActionButtons(booking);

  return (
    <div className={styles.bookingCard}>
      <span className={`${styles.statusBadge} ${styles[booking.status.toLowerCase()]}`}>
        {t(booking.status.toLowerCase())}
      </span>

      <div className={styles.cardHeader}>
        <div>
          <div className={styles.userName}>{booking.name}</div>
          <div className={styles.subText}>{booking.mobile_no || "-"}</div>
        </div>

        <button
          className={styles.expandBtn}
          onClick={() => setOpen(!open)}
          aria-label={t("toggleDetails")}
        >
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {open ? (
        <div className={styles.details}>
          <div className={styles.grid}>
            <div><span>{t("people")}</span>{booking.people_count}</div>
            <div><span>{t("menu")}</span>{booking.menu_preference || "-"}</div>
            <div><span>{t("date")}</span>{formatDate(booking.function_date)}</div>
            <div><span>{t("requestedAt")}</span>{formatDate(booking.created_at)}</div>
            <div className={styles.gridWide}><span>{t("address")}</span>{booking.address || "-"}</div>
            <div className={styles.gridWide}><span>{t("notes")}</span>{booking.notes || "-"}</div>
          </div>

          <div className={styles.cardActions}>
            {actions.length === 0 ? (
              <span className={styles.noAction}>—</span>
            ) : actions.map((action) => (
              <button
                key={action}
                className={
                  action === "Confirmed"
                    ? styles.confirm
                    : action === "Rejected"
                    ? styles.reject
                    : styles.complete
                }
                onClick={() => onStatusChange(booking.id, action)}
              >
                {action === "Confirmed"
                  ? t("confirm")
                  : action === "Rejected"
                  ? t("reject")
                  : t("complete")}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BookingRequests() {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [confirmData, setConfirmData] = useState(null);

  const STATUS_OPTIONS = [
    { value: "all", label: t("all") },
    { value: "pending", label: t("pending") },
    { value: "confirmed", label: t("confirmed") },
    { value: "rejected", label: t("rejected") },
    { value: "completed", label: t("completed") },
  ];

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setBookings([]);
        return;
      }

      const data = await offlineFetch("bookings-list-v2", async () => {
        const res = await fetch(`${API_BASE}/api/bookings/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch bookings");
        return json;
      });

      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useAppRefresh(fetchBookings);

  const filteredBookings = useMemo(() => {
    const next = filter === "all"
      ? bookings
      : bookings.filter((booking) => String(booking.status || "").toLowerCase() === filter);

    return [...next].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [bookings, filter]);

  const openConfirmModal = (id, status) => {
    setConfirmData({ id, status });
  };

  const confirmStatusUpdate = async () => {
    if (!confirmData) return;

    const { id, status } = confirmData;

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
      setConfirmData(null);
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1>{t("functionBookings")}</h1>

        <div className={styles.controls}>
          <label>{t("filter")}</label>
          <DayDropdown options={STATUS_OPTIONS} value={filter} onChange={setFilter} />
        </div>

        {loading ? (
          <p>{t("loadingBookings")}</p>
        ) : (
          <>
            <div className={styles.desktopOnly}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
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
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className={styles.emptyRow}>{t("noBookingsFound")}</td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => {
                        const actions = getActionButtons(booking);
                        return (
                          <tr key={booking.id}>
                            <td>{booking.name || "-"}</td>
                            <td>{booking.mobile_no || "-"}</td>
                            <td>{booking.people_count || "-"}</td>
                            <td>{booking.menu_preference || "-"}</td>
                            <td>{formatDate(booking.function_date)}</td>
                            <td>
                              <span className={`${styles.status} ${styles[booking.status.toLowerCase()]}`}>
                                {t(booking.status.toLowerCase())}
                              </span>
                            </td>
                            <td>{booking.notes || "-"}</td>
                            <td>
                              <div className={styles.actions}>
                                {actions.length === 0 ? (
                                  <span className={styles.noAction}>—</span>
                                ) : actions.map((action) => (
                                  <button
                                    key={action}
                                    onClick={() => openConfirmModal(booking.id, action)}
                                    className={
                                      action === "Confirmed"
                                        ? styles.confirm
                                        : action === "Rejected"
                                        ? styles.reject
                                        : styles.complete
                                    }
                                  >
                                    {action === "Confirmed"
                                      ? t("confirm")
                                      : action === "Rejected"
                                      ? t("reject")
                                      : t("complete")}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.mobileOnly}>
              {filteredBookings.length === 0 ? (
                <p>{t("noBookingsFound")}</p>
              ) : (
                filteredBookings.map((booking) => (
                  <MobileBookingCard
                    key={booking.id}
                    booking={booking}
                    t={t}
                    onStatusChange={openConfirmModal}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {confirmData ? (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>{t("confirmAction")}</h3>
            <p>{t("areYouSure")}?</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmData(null)}>
                {t("cancel")}
              </button>
              <button className={styles.confirmBtn} onClick={confirmStatusUpdate}>
                {t("yesProceed")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
