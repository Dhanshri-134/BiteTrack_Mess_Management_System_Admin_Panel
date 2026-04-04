import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/analytics.module.css";
import { offlineFetch } from "../../lib/offlineFetch";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useLanguage } from "../../context/LanguageContext";
import { API_BASE } from "../../lib/api";
import { formatDayOfMonth, formatDisplayDate } from "../../lib/dateFormat";

export default function AnalyticsPage() {

  const { t } = useLanguage();

  const [data, setData] = useState([]);
  const [methods, setMethods] = useState([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState("daily");
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [modalData, setModalData] = useState([]);
  const [modalSearch, setModalSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const d = await offlineFetch(`billing-analytics-${type}`, async () => {
        const res = await fetch(`${API_BASE}/api/analytics/collection/?type=${type}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      });
      const formattedChart = (d.chart || []).map(item => {
        if (type === "daily") {
          return {
            label: formatDayOfMonth(item.label),
            rawDate: item.label,
            total: Number(item.total)
          };
        }
        
        if (type === "weekly") {
          return {
            label: item.label,
            rawDate: item.raw_date,
            total: Number(item.total)
          };
        }
        return {
          label: item.label,
          rawDate: item.label,
          total: Number(item.total)
        };
      });

      setData(formattedChart);
      setMethods(d.methods || []);
      setTotal(Number(d.total || 0));

    } catch (err) {
      console.error(err);
      setData([]);
      setMethods([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  const openDayDetails = async (date) => {
    try {
      const token = localStorage.getItem("token");

      const d = await offlineFetch(`analytics-day-details-${date}`, async () => {
        const res = await fetch(
          `/api/analytics/day-details/?date=${date}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!res.ok) throw new Error("Failed to fetch day details");
        return res.json();
      });

      setModalData(d.users || []);
      setSelectedDate(date);
      setShowModal(true);
      setModalSearch("");

    } catch (err) {
      console.error(err);
    }
  };

  const openWeekDetails = async (startDate) => {
    try {
      const token = localStorage.getItem("token");

      const d = await offlineFetch(`analytics-week-details-${startDate}`, async () => {
        const res = await fetch(
          `/api/analytics/week-details/?start=${startDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!res.ok) throw new Error("Failed to fetch week details");
        return res.json();
      });

      setModalData(d.users || []);
      setSelectedDate(startDate);
      setShowModal(true);
      setModalSearch("");

    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = modalData.filter(u =>
    `${u.name} ${u.email}`
      .toLowerCase()
      .includes(modalSearch.toLowerCase())
  );

  return (
    <Layout>
      <div className={styles.container}>
        <h1>{t("analytics")}</h1>

        {/* TOTAL */}
        <div className={styles.statCard}>
          <h3>{t("totalCollection")}</h3>
          <p>₹{total.toFixed(2)}</p>
        </div>

        {/* LOADING */}

            <div className={styles.controls}>
              <button className={type === "daily" ? styles.activeTab : ""} onClick={() => setType("daily")}>{t("daily")}</button>
              <button className={type === "weekly" ? styles.activeTab : ""} onClick={() => setType("weekly")}>{t("weekly")}</button>
              <button className={type === "monthly" ? styles.activeTab : ""} onClick={() => setType("monthly")}>{t("monthly")}</button>
            </div>
        {loading && <p>{t("loading")}</p>}
        {/* NO DATA */}
        {!loading && data.length === 0 && (
          <div className={styles.empty}>{t("noDataAvailable")}</div>
        )}

        {/* CHART */}
        {!loading && data.length > 0 && (
          <>

            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill="#0f766e"
                    radius={[10, 10, 0, 0]}
                    stroke="none"
                    activeBar={{ stroke: "none" }}
                    cursor={type === "monthly" ? "default" : "pointer"}
                    onClick={(data) => {
                      if (!data) return;

                      if (type === "daily") {
                        openDayDetails(data.rawDate);
                      } else if (type === "weekly") {
                        openWeekDetails(data.rawDate);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* TREND */}
            <h3 style={{ marginTop: 30 }}>{t("trend")}</h3>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#0f766e" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* PAYMENT METHODS */}
        {methods.length > 0 && (
          <>
            <h3 style={{ marginTop: 30 }}>{t("paymentMethods")}</h3>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methods}>
                  <XAxis dataKey="payment_method" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0f766e" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* MODAL */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>

              <h3>
                {t("collectionDetails")} —{" "}
                {formatDisplayDate(selectedDate)}
              </h3>

              <input
                className={styles.input}
                placeholder={t("searchUser")}
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
              />

              <div style={{ marginTop: 15, maxHeight: 300, overflowY: "auto" }}>
                {filteredUsers.length === 0 ? (
                  <p>{t("noUsersFound")}</p>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid #eee"
                      }}
                    >
                      <div>
                        <strong>{u.name}</strong>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          {u.email}
                        </div>
                      </div>

                      <div>
                        ₹{Number(u.amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 15, textAlign: "right" }}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  {t("close")}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
