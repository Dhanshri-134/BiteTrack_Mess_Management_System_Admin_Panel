// pages/leave.js
import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import styles from "../../styles/leave.module.css";
import { offlineFetch } from "@/lib/offlineFetch";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { DatabaseIcon } from "lucide-react";


const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState("requests");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveMembers, setLeaveMembers] = useState(null);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [historySearch, setHistorySearch] = useState("");
const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");

  
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
const [historySort, setHistorySort] = useState("latest");
const [groupByUser, setGroupByUser] = useState(false);

  
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });
  
  const fetchData = async () => {
    setLoading(true);
    
    try {
      const token = getToken();
      if (!token) return console.warn(t("tokenMissing"));

      const data = await offlineFetch("leave-all-data", async () => {
        const [resRequests, resHistory, resMembers] = await Promise.all([
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/leave/requests/",
            { headers: authHeaders() }
          ),
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/leave/history/",
            { headers: authHeaders() }
          ),
          fetch(
            "https://bite-track-mess-management-system-a.vercel.app/api/leave/members/",
            { method: "GET", headers: authHeaders() }
          ),
        ]);

        if (!resRequests.ok) throw new Error(t("failedToFetchLeaveRequests"));
        if (!resHistory.ok) throw new Error(t("failedToFetchLeaveHistory"));
        if (!resMembers.ok) throw new Error(t("failedToFetchLeaveMembers"));

        const membersData = await resMembers.json();

        return {
          requests: await resRequests.json(),
          history: await resHistory.json(),
          members: membersData,
        };
      });
      
      setLeaveRequests(Array.isArray(data.requests) ? data.requests : []);
      setLeaveHistory(Array.isArray(data.history) ? data.history : []);
      setLeaveMembers(
        Array.isArray(data.members.approved_members)
        ? data.members.approved_members
        : []
      );
    } catch (err) {
      console.error(t("fetchDataError"), err);
      setLeaveRequests([]);
      setLeaveHistory([]);
      setLeaveMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  useAppRefresh(fetchData);

  return (
    <Layout>
      <div className={styles.container}>
         <main className={styles.main}>
          
        <h1 className={styles.title}>{t("leaveManagement")}</h1>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "requests" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("requests")}
          >
            {t("leaveRequests")}
          </button>

          <button
            className={`${styles.tabBtn} ${
              activeTab === "members" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("members")}
          >
            {t("leaveMembers")}
          </button>

          <button
            className={`${styles.tabBtn} ${
              activeTab === "history" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("history")}
          >
            {t("leaveHistory")}
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <p>{t("loading")}</p>
          ) : activeTab === "requests" ? (
            <LeaveTable data={leaveRequests} type="requests" refresh={fetchData} />
          ) : activeTab === "history" ? (
            <LeaveTable
  data={leaveHistory}
  type="history"
  refresh={fetchData}
  statusFilter={historyStatusFilter}
  setStatusFilter={setHistoryStatusFilter}
  sortOrder={historySort}
  setSortOrder={setHistorySort}
  groupByUser={groupByUser}
  setGroupByUser={setGroupByUser}
  historySearch={historySearch}
  setHistorySearch={setHistorySearch}
  dateFrom={dateFrom}
  setDateFrom={setDateFrom}
  dateTo={dateTo}
  setDateTo={setDateTo}
/>
          ) : (
            <LeaveMembers data={leaveMembers} />
          )}
        </div>
         </main>
      </div>
      
    </Layout>
  );
}

/* ========================== */
/* ===== REQUESTS / HISTORY ===== */
/* ========================== */

function LeaveTable({ data,
  type,
  refresh,
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  groupByUser,
  setGroupByUser, 
  historySearch,
  setHistorySearch,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,}) {
  const { t } = useLanguage();

  if (!data?.length)
    return <p className={styles.emptyState}>{t("noRecordsFound")}</p>;

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        "https://bite-track-mess-management-system-a.vercel.app/api/leave/update-status/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id, action }),
        }
      );

      const result = await res.json();
      if (!res.ok) return toast.error(t("somethingWentWrong"));

      refresh();
    } catch {
      toast.error(t("somethingWentWrong"));
    }
  };

let processedData = [...data];

if (type === "history") {

  // 🔹 Status filter
  if (statusFilter !== "all") {
    processedData = processedData.filter(
      (item) => item.status === statusFilter
    );
  }

  // 🔹 Search filter
  if (historySearch) {
    const searchLower = historySearch.toLowerCase();
    processedData = processedData.filter(
      (item) =>
        item.user_name?.toLowerCase().includes(searchLower) ||
        item.email?.toLowerCase().includes(searchLower) ||
        item.user_email?.toLowerCase().includes(searchLower)
    );
  }

  // 🔹 Date range filter
  if (dateFrom) {
    processedData = processedData.filter(
      (item) => new Date(item.from_date) >= new Date(dateFrom)
    );
  }

  if (dateTo) {
    processedData = processedData.filter(
      (item) => new Date(item.to_date) <= new Date(dateTo)
    );
  }

  // 🔹 Sort
  processedData.sort((a, b) => {
    const dateA = new Date(a.from_date);
    const dateB = new Date(b.from_date);
    return sortOrder === "latest"
      ? dateB - dateA
      : dateA - dateB;
  });
}

let groupedData = [];

if (type === "history" && groupByUser) {
  const map = {};

  processedData.forEach((item) => {
    if (!map[item.user_id]) {
      map[item.user_id] = {
        user_id: item.user_id,
        user_name: item.user_name,
        user_email: item.user_email || item.email,
        phone: item.contact_no,
        hostel_name: item.hostel_name,
        leaves: [],
      };
    }

    map[item.user_id].leaves.push(item);
  });

  groupedData = Object.values(map);
}
  return (
    <>
    {type === "history" && (
  <div className={styles.filterBar}>

    <input
      type="text"
      placeholder={t("searchByNameOrEmail")}
      value={historySearch}
      onChange={(e) => setHistorySearch(e.target.value)}
      className={styles.searchInput}
    />
    <label>
      {t("startDate")}
    <input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
      className={styles.select}
      />
      </label>
    <label>
      {t("endDate")}
    <input
      type="date"
      value={dateTo}
      
      onChange={(e) => setDateTo(e.target.value)}
      className={styles.select}
      />
      </label>
      

    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className={styles.select}
    >
      <option value="all">{t("All")}</option>
      <option value="Approved">{t("approved")}</option>
      <option value="Rejected">{t("rejected")}</option>
    </select>

    <select
      value={sortOrder}
      onChange={(e) => setSortOrder(e.target.value)}
      className={styles.select}
    >
      <option value="latest">{t("LatestFirst")}</option>
      <option value="oldest">{t("OldestFirst")}</option>
    </select>
    <div className={styles.check}>
      
      <input
        type="checkbox"
        checked={groupByUser}
        onChange={(e) => setGroupByUser(e.target.checked)}
        />
      <span>
      {t("GroupByUser")}
      </span>
        </div>

  </div>

)}
      {/* DESKTOP TABLE */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("name")}</th>
            <th>{t("email")}</th>
            <th>{t("contact")}</th>
            <th>{t("hostel")}</th>
            <th>{t("from")}</th>
            <th>{t("to")}</th>
            {type === "requests" && <th>{t("actions")}</th>}
            {type === "history" && <th>{t("status")}</th>}
          </tr>
        </thead>

        <tbody>
          {(processedData).map((item) => (
            <tr key={item.id}>
              <td>{item.user_name}</td>
              <td>{item.email || item.user_email}</td>
              <td>{item.contact_no}</td>
              <td>{item.hostel_name}</td>
              <td>{formatDate(item.from_date)}</td>
              <td>{formatDate(item.to_date)}</td>

              {type === "requests" && (
                <td>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleAction(item.id, "Approved")}
                  >
                    {t("approve")}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleAction(item.id, "Rejected")}
                  >
                    {t("reject")}
                  </button>
                </td>
              )}

              {type === "history" && (
                <td>
                  <span
                    className={
                      item.status === "Approved"
                        ? styles.approved
                        : item.status === "Rejected"
                        ? styles.rejected
                        : styles.pending
                    }
                  >
                    {item.status === "Approved"
                      ? t("approved")
                      : item.status === "Rejected"
                      ? t("rejected")
                      : t("pending")}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* MOBILE STACKED CARDS */}
      <div className={styles.mobileList}>
        {groupByUser ? (
  groupedData.map((user) => (
    <GroupedLeaveCard key={user.user_id} user={user} />
  ))
) : (
  processedData.map((item) => (
          <div key={item.id} className={styles.mobileCard}>
            <p><span className={styles.header}>{t("name")}:</span> {item.user_name}</p>
            <p><span className={styles.header}>{t("email")}:</span> {item.email || item.user_email}</p>
            <p><span className={styles.header}>{t("contact")}:</span> {item.contact_no}</p>
            <p><span className={styles.header}>{t("hostel")}:</span> {item.hostel_name}</p>
            <p><span className={styles.header}>{t("from")}:</span> {formatDate(item.from_date)}</p>
            <p><span className={styles.header}>{t("to")}:</span> {formatDate(item.to_date)}</p>

            {type === "requests" && (
              <div className={styles.mobileActions}>
                <button
                  className={styles.approveBtn}
                  onClick={() => handleAction(item.id, "Approved")}
                >
                  {t("approve")}
                </button>
                <button
                  className={styles.rejectBtn}
                  onClick={() => handleAction(item.id, "Rejected")}
                >
                  {t("reject")}
                </button>
              </div>
            )}

            {type === "history" && (
              <span
                className={
                  item.status === "Approved"
                    ? styles.approved
                    : item.status === "Rejected"
                    ? styles.rejected
                    : styles.pending
                }
              >
                {item.status === "Approved"
                  ? t("approved")
                  : item.status === "Rejected"
                  ? t("rejected")
                  : t("pending")}
              </span>
            )}
          </div>
        )))}
      </div>
    </>
  );
}

function GroupedLeaveCard({ user }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className={styles.mobileCard}>
      
      {/* 🔹 USER HEADER (shown once) */}
      <div
        className={styles.groupHeader}
        onClick={() => setOpen(!open)}
      >
        <div>
          <p><strong>{t("name")}:</strong> {user.user_name}</p>
          <p><strong>{t("email")}:</strong> {user.user_email}</p>
          <p><strong>{t("contact")}:</strong> {user.phone}</p>
          <p><strong>{t("hostel")}:</strong> {user.hostel_name}</p>
        </div>
        <span className={styles.expandIcon}>
          {open ? "▲" : "▼"}
        </span>

      </div>

      {/* 🔹 LEAVE DATES (only dates repeated) */}
      {open && (
        <div className={styles.groupBody}>
          {user.leaves.map((leave) => (
            <div key={leave.id} className={styles.leaveItem}>
              
              <p><strong>{t("from")}:</strong> {formatDate(leave.from_date)}</p>
              <p><strong>{t("to")}:</strong> {formatDate(leave.to_date)}</p>

              <p>
                <span
                  className={
                    leave.status === "Approved"
                      ? styles.approved
                      : styles.rejected
                  }
                >
                  {leave.status}
                </span>
              </p>

              <hr className={styles.leaveDivider}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================== */
/* ===== LEAVE MEMBERS ===== */
/* ========================== */

function LeaveMembers({ data }) {
  const { t } = useLanguage();

  if (!data) return <p>{t("loading")}</p>;

  const approved_members = data;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

  if (approved_members.length === 0) {
    return <p className={styles.emptyState}>{t("noApprovedLeaveMembers")}</p>;
  }

  return (
    <>
      <div className={styles.mobileList}>
        {approved_members.map((item) => (
          <div key={item.id} className={styles.mobileCard}>
            <p><strong>{t("name")}:</strong> {item.user_name}</p>
            <p><strong>{t("email")}:</strong> {item.user_email}</p>
            <p><strong>{t("contact")}:</strong> {item.phone}</p>
            <p><strong>{t("from")}:</strong> {formatDate(item.from_date)}</p>
            <p><strong>{t("to")}:</strong> {formatDate(item.to_date)}</p>
          </div>
        ))}
      </div>
    </>
  );
}




      {/* <h2 className={styles.subTitle}>Excess Absent Members</h2>

      <div className={styles.mobileList}>
        {excess_absent_members.map((item) => (
          <div key={item.user_id} className={styles.mobileCard}>
            <p><strong>Name:</strong> {item.user_name}</p>
            <p><strong>Email:</strong> {item.user_email}</p>
            <p><strong>Contact:</strong> {item.phone}</p>
            <p><strong>Absent Days:</strong> {item.absent_count}</p>
            <p><strong>From:</strong> {formatDate(item.start_date)}</p>
            <p><strong>To:</strong> {formatDate(item.end_date)}</p>
          </div>
        ))}
      </div> */}
//     </>
//   );
// }




