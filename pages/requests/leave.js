import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import DayDropdown from "../../components/DayDropdown";
import { useLanguage } from "../../context/LanguageContext";
import { offlineFetch } from "@/lib/offlineFetch";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { API_BASE } from "../../lib/api";
import styles from "../../styles/leave.module.css";


const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function LeaveManagement() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("requests");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [leaveMembers, setLeaveMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historySort, setHistorySort] = useState("latest");
  const [groupByUser, setGroupByUser] = useState(false);
  const [showHistoryFilters, setShowHistoryFilters] = useState(true);

  const HISTORY_STATUS_OPTIONS = [
    { value: "all", label: t("allStatuses") },
    { value: t("approved"), label: "Approved" },
    { value: t("rejected"), label: "Rejected" },
  ];

  const HISTORY_SORT_OPTIONS = [
    { value: "latest", label: t("latestFirst") },
    { value: "oldest", label: t("oldestFirst") },
  ];

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
      if (!token) {
        setLeaveRequests([]);
        setLeaveHistory([]);
        setLeaveMembers([]);
        return;
      }

      const data = await offlineFetch("leave-all-data-v2", async () => {
        const [resRequests, resHistory, resMembers] = await Promise.all([
          fetch(`${API_BASE}/api/leave/requests/`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/leave/history/`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/leave/members/`, { headers: authHeaders() }),
        ]);

        if (!resRequests.ok) throw new Error("Failed to fetch leave requests");
        if (!resHistory.ok) throw new Error("Failed to fetch leave history");
        if (!resMembers.ok) throw new Error("Failed to fetch leave members");

        return {
          requests: await resRequests.json(),
          history: await resHistory.json(),
          members: await resMembers.json(),
        };
      });

      setLeaveRequests(Array.isArray(data?.requests) ? data.requests : []);
      setLeaveHistory(Array.isArray(data?.history) ? data.history : []);
      setLeaveMembers(Array.isArray(data?.members?.approved_members) ? data.members.approved_members : []);
    } catch (error) {
      console.error("Leave fetch error:", error);
      setLeaveRequests([]);
      setLeaveHistory([]);
      setLeaveMembers([]);
      toast.error(t("somethingWentWrong"));
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

          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${activeTab === "requests" ? styles.active : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              {t("leaveRequests")}
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "members" ? styles.active : ""}`}
              onClick={() => setActiveTab("members")}
            >
              {t("leaveMembers")}
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "history" ? styles.active : ""}`}
              onClick={() => setActiveTab("history")}
            >
              {t("leaveHistory")}
            </button>
          </div>

          <div className={styles.content}>
            {loading ? (
              <p className={styles.emptyState}>{t("loading")}</p>
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
                showFilters={showHistoryFilters}
                setShowFilters={setShowHistoryFilters}
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

function LeaveTable({
  data,
  type,
  refresh,
  statusFilter = "all",
  setStatusFilter = () => {},
  sortOrder = "latest",
  setSortOrder = () => {},
  groupByUser = false,
  setGroupByUser = () => {},
  historySearch = "",
  setHistorySearch = () => {},
  dateFrom = "",
  setDateFrom = () => {},
  dateTo = "",
  setDateTo = () => {},
  showFilters = true,
  setShowFilters = () => {},
}) {
  const { t } = useLanguage();
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const processedData = useMemo(() => {
    let next = Array.isArray(data) ? [...data] : [];

    if (type !== "history") {
      return next;
    }

    if (statusFilter !== "all") {
      next = next.filter((item) => item.status === statusFilter);
    }

    if (historySearch.trim()) {
      const query = historySearch.toLowerCase();
      next = next.filter((item) => {
        return [item.user_name, item.user_email, item.email, item.contact_no]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      next = next.filter((item) => new Date(item.from_date) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      next = next.filter((item) => new Date(item.to_date) <= to);
    }

    next.sort((a, b) => {
      const left = new Date(a.from_date).getTime();
      const right = new Date(b.from_date).getTime();
      return sortOrder === "latest" ? right - left : left - right;
    });

    return next;
  }, [data, type, statusFilter, historySearch, dateFrom, dateTo, sortOrder]);

  const groupedData = useMemo(() => {
    if (type !== "history" || !groupByUser) {
      return [];
    }

    const groups = new Map();

    processedData.forEach((item) => {
      const key = item.user_id || item.user_email || item.id;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          user_name: item.user_name || "-",
          user_email: item.user_email || item.email || "-",
          phone: item.contact_no || "-",
          hostel_name: item.hostel_name || "-",
          leaves: [],
        });
      }

      groups.get(key).leaves.push(item);
    });

    return Array.from(groups.values());
  }, [processedData, groupByUser, type]);

  const handleAction = async (id, action) => {
    try {
      console.log("Function Called")
      setActionLoadingId(`${id}-${action}`);
      const token = localStorage.getItem("token");
      
      const res = await fetch(`${API_BASE}/api/leave/update-status/`, {
      // const res = await fetch(`/api/leave/update-status/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, action }),
      });
      console.log("API Hit")
      
      const result = await res.json();
      console.log("Result Got",result)
      if (!res.ok) {
        throw new Error(result?.message || result?.error || "Request failed");
      }
      
      toast.success(action === "Approved" ? "Leave approved" : "Leave rejected");
      await refresh();
    } catch (error) {
      console.log("Error")
      console.error("Leave action error:", error);
      toast.error(error.message || t("somethingWentWrong"));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      {type === "history" ? (
        <div className={styles.filtersShell}>
          <button
            type="button"
            className={styles.filterToggle}
            onClick={() => setShowFilters(!showFilters)}
          >
            <span>
              <Filter size={16} /> Filters
            </span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showFilters ? (
            <div className={styles.filterBar}>
              <label className={styles.filterField}>
                <span>{t("search")}</span>
                <input
                  type="text"
                  placeholder={t("searchByNameOrEmail")}
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  className={styles.searchInput}
                />
              </label>

              <label className={styles.filterField}>
                <span>{t("startDate")}</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className={`${styles.input} ${styles.dateInput}`}
                />
              </label>

              <label className={styles.filterField}>
                <span>{t("endDate")}</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className={`${styles.input} ${styles.dateInput}`}
                />
              </label>

              <label className={styles.filterField}>
                <span>{t("status")}</span>
                <DayDropdown
                  options={[
                    { value: "all", label: t("allStatuses") },
                    { value: t("approved"), label: "Approved" },
                    { value: t("rejected"), label: "Rejected" },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </label>

              <label className={styles.filterField}>
                <span>{t("sort")}</span>
                <DayDropdown
                  options={[
                    { value: "latest", label: t("latestFirst") },
                    { value: "oldest", label: t("oldestFirst") },
                  ]}
                  value={sortOrder}
                  onChange={setSortOrder}
                />
              </label>

              <label className={`${styles.filterField} ${styles.checkboxField}`}>
                <span>{t("groupByUser")}</span>
                <input
                  type="checkbox"
                  checked={groupByUser}
                  onChange={(event) => setGroupByUser(event.target.checked)}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {processedData.length === 0 ? (
        <p className={styles.emptyState}>{t("noRecordsFound")}</p>
      ) : null}

      {processedData.length > 0 ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("contact")}</th>
                <th>{t("hostel")}</th>
                <th>{t("from")}</th>
                <th>{t("to")}</th>
                {type === "requests" ? <th>{t("actions")}</th> : <th>{t("status")}</th>}
              </tr>
            </thead>
            <tbody>
              {processedData.map((item) => (
                <tr key={item.id}>
                  <td>{item.user_name || "-"}</td>
                  <td>{item.user_email || item.email || "-"}</td>
                  <td>{item.contact_no || "-"}</td>
                  <td>{item.hostel_name || "-"}</td>
                  <td>{formatDate(item.from_date)}</td>
                  <td>{formatDate(item.to_date)}</td>
                  {type === "requests" ? (
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          className={styles.approveBtn}
                          disabled={actionLoadingId === `${item.id}-Approved`}
                          onClick={() => handleAction(item.id, "Approved")}
                        >
                          {actionLoadingId === `${item.id}-Approved` ? "..." : t("approve")}
                        </button>
                        <button
                          className={styles.rejectBtn}
                          disabled={actionLoadingId === `${item.id}-Rejected`}
                          onClick={() => handleAction(item.id, "Rejected")}
                        >
                          {actionLoadingId === `${item.id}-Rejected` ? "..." : t("reject")}
                        </button>
                      </div>
                    </td>
                  ) : (
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
                        {item.status}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className={styles.mobileList}>
        {type === "history" && groupByUser
          ? groupedData.map((user) => <GroupedLeaveCard key={user.key} user={user} />)
          : processedData.map((item) => (
              <div key={item.id} className={styles.mobileCard}>
                <p><span className={styles.header}>{t("name")}</span>{item.user_name || "-"}</p>
                <p><span className={styles.header}>{t("email")}</span>{item.user_email || item.email || "-"}</p>
                <p><span className={styles.header}>{t("contact")}</span>{item.contact_no || "-"}</p>
                <p><span className={styles.header}>{t("hostel")}</span>{item.hostel_name || "-"}</p>
                <p><span className={styles.header}>{t("from")}</span>{formatDate(item.from_date)}</p>
                <p><span className={styles.header}>{t("to")}</span>{formatDate(item.to_date)}</p>

                {type === "requests" ? (
                  <div className={styles.mobileActions}>
                    <button
                      className={styles.approveBtn}
                      disabled={actionLoadingId === `${item.id}-Approved`}
                      onClick={() => handleAction(item.id, "Approved")}
                    >
                      {actionLoadingId === `${item.id}-Approved` ? "..." : t("approve")}
                    </button>
                    <button
                      className={styles.rejectBtn}
                      disabled={actionLoadingId === `${item.id}-Rejected`}
                      onClick={() => handleAction(item.id, "Rejected")}
                    >
                      {actionLoadingId === `${item.id}-Rejected` ? "..." : t("reject")}
                    </button>
                  </div>
                ) : (
                  <span
                    className={
                      item.status === "Approved"
                        ? styles.approved
                        : item.status === "Rejected"
                        ? styles.rejected
                        : styles.pending
                    }
                  >
                    {item.status}
                  </span>
                )}
              </div>
            ))}
      </div>
    </>
  );
}

function GroupedLeaveCard({ user }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className={styles.mobileCard}>
      <button type="button" className={styles.groupHeader} onClick={() => setOpen(!open)}>
        <div className={styles.groupHeaderContent}>
          <p><strong>{t("name")}</strong> {user.user_name}</p>
          <p><strong>{t("email")}</strong> {user.user_email}</p>
          <p><strong>{t("contact")}</strong> {user.phone}</p>
          <p><strong>{t("hostel")}</strong> {user.hostel_name}</p>
        </div>
        <span className={styles.expandIcon}>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {open ? (
        <div className={styles.groupBody}>
          {user.leaves.map((leave) => (
            <div key={leave.id} className={styles.leaveItem}>
              <p><strong>{t("from")}</strong> {formatDate(leave.from_date)}</p>
              <p><strong>{t("to")}</strong> {formatDate(leave.to_date)}</p>
              <p>
                <span
                  className={
                    leave.status === "Approved"
                      ? styles.approved
                      : leave.status === "Rejected"
                      ? styles.rejected
                      : styles.pending
                  }
                >
                  {leave.status}
                </span>
              </p>
              <hr className={styles.leaveDivider} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LeaveMembers({ data }) {
  const { t } = useLanguage();

  if (!Array.isArray(data) || data.length === 0) {
    return <p className={styles.emptyState}>{t("noApprovedLeaveMembers")}</p>;
  }

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("email")}</th>
              <th>{t("contact")}</th>
              <th>{t("from")}</th>
              <th>{t("to")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.user_name || "-"}</td>
                <td>{item.user_email || "-"}</td>
                <td>{item.phone || "-"}</td>
                <td>{formatDate(item.from_date)}</td>
                <td>{formatDate(item.to_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {data.map((item) => (
          <div key={item.id} className={styles.mobileCard}>
            <p><span className={styles.header}>{t("name")}</span>{item.user_name || "-"}</p>
            <p><span className={styles.header}>{t("email")}</span>{item.user_email || "-"}</p>
            <p><span className={styles.header}>{t("contact")}</span>{item.phone || "-"}</p>
            <p><span className={styles.header}>{t("from")}</span>{formatDate(item.from_date)}</p>
            <p><span className={styles.header}>{t("to")}</span>{formatDate(item.to_date)}</p>
          </div>
        ))}
      </div>
    </>
  );
}
