import { useEffect, useMemo, useState } from "react";
import styles from "../styles/billing.module.css";
import toast from "react-hot-toast";
import { useLanguage } from "../context/LanguageContext";
import { ChevronDown } from "lucide-react";
import { offlineFetch } from "@/lib/offlineFetch";
import { Download, Eye } from "lucide-react";

import GlobalLoader from "../components/GlobalLoader";

export default function PaymentHistory({ token }) {
    const { t } = useLanguage();

    const [users, setUsers] = useState([]);
    const [expandedUser, setExpandedUser] = useState(null);
    const [historyMap, setHistoryMap] = useState({});
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [receiptModal, setReceiptModal] = useState(null);

    const authHeaders = {
        Authorization: `Bearer ${token}`,
    };

    /* ================= LOAD USERS (PAID ONLY) ================= */
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);

                const data =
                    (await offlineFetch("payment-history-users", async () => {
                        const res = await fetch(
                            "https://bite-track-mess-management-system-a.vercel.app/api/bills/history/",
                            { headers: authHeaders }
                        );
                        if (!res.ok) throw new Error("history users fetch failed");
                        return res.json();
                    })) ?? { users: [] };

                setUsers(data.users || []);
            } catch (err) {
                console.error(err);
                toast.error(t("failedToLoad"));
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);




    /* ================= LOAD HISTORY (LAZY) ================= */
    const loadHistory = async (userId) => {
        if (historyMap[userId]) return;

        try {
            // setLoading(true);

            const data =
                (await offlineFetch(`payment-history-${userId}`, async () => {
                    const res = await fetch(
                        `https://bite-track-mess-management-system-a.vercel.app/api/bills/history/?user_id=${userId}`,
                        { headers: authHeaders }
                    );
                    if (!res.ok) throw new Error("history fetch failed");
                    return res.json();
                })) ?? { history: [] };

            setHistoryMap(prev => ({
                ...prev,
                [userId]: data.history || [],
            }));
        } catch (err) {
            console.error(err);
            toast.error(t("failedToLoad"));
        } finally {
            setLoading(false);
        }
    };



    const TooltipText = ({ value }) => {
        const [pos, setPos] = useState({ x: 0, y: 0, show: false });

        useEffect(() => {
            if (!pos.show) return;

            const hide = () => setPos(p => ({ ...p, show: false }));

            window.addEventListener("scroll", hide, { passive: true });
            window.addEventListener("resize", hide);
            window.addEventListener("touchstart", hide);

            return () => {
                window.removeEventListener("scroll", hide);
                window.removeEventListener("resize", hide);
                window.removeEventListener("touchstart", hide);
            };
        }, [pos.show]);

        const showTooltip = (e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const tooltipWidth = 220;
            const padding = 8;

            let x = r.left + r.width / 2 - tooltipWidth / 2;
            let y = r.top - 10;

            if (x < padding) x = padding;
            if (x + tooltipWidth > window.innerWidth - padding) {
                x = window.innerWidth - tooltipWidth - padding;
            }
            if (y < padding) y = r.bottom + 10;

            setPos({ x, y, show: true });
        };

        return (
            <span
                className={styles.truncate}
                tabIndex={0}
                onMouseEnter={showTooltip}
                onFocus={showTooltip}
                onMouseLeave={() => setPos(p => ({ ...p, show: false }))}
                onBlur={() => setPos(p => ({ ...p, show: false }))}
            >
                {value}

                {pos.show && (
                    <span
                        className={styles.tooltip}
                        style={{ left: pos.x, top: pos.y, width: 220 }}
                    >
                        {value}
                    </span>
                )}
            </span>
        );
    };




    /* ================= SEARCH ================= */
    const filteredUsers = useMemo(() => {
        if (!search) return users;
        return users.filter(u =>
            `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);


    const ReceiptModal = () => {
        if (!receiptModal) return null;

        return (
            <div className={styles.receiptModalOverlay} onClick={() => setReceiptModal(null)}>
                <div className={styles.receiptModal} onClick={(e) => e.stopPropagation()}>

                    <div className={styles.receiptHeader}>
                        <h3>{t("receiptPreview")}</h3>

                        <button
                            className={styles.downloadBtn}
                            onClick={() => window.open(receiptModal, "_blank")}
                        >
                            <Download size={18} />
                        </button>
                    </div>

                    <iframe
                        src={receiptModal}
                        className={styles.receiptFrame}
                        title="Receipt"
                    />

                </div>
            </div>
        );
    };

    return (
        <>
            {/* ================= SEARCH ================= */}
            <div className={styles.controls}>
                <div className={styles.controlItem}>
                    <label>{t("search")}</label>
                    <input
                        placeholder={t("searchPlaceholder")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* ================= DESKTOP TABLE ================= */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>{t("user")}</th>
                            <th>{t("email")}</th>
                            <th>{t("date")}</th>
                            <th>{t("amount")}</th>
                            <th>{t("paymentType")}</th>
                            <th>{t("paymentMethod")}</th>
                            <th>{t("billingPeriod")}</th>
                            <th>{t("transactionId")}</th>
                            <th>{t("actions")}</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredUsers.map(u => {
                            const p = u.latest_payment;
                            if (!p) return null;

                            return (
                                <table>
                                    <tr key={u.id}>
                                        <td>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>{p.payment_date}</td>
                                        <td>₹{Number(p.amount).toFixed(2)}</td>
                                        <td>{p.payment_type}</td>
                                        <td>{p.payment_method || "-"}</td>
                                        <td>
                                            {p.billing_start_date} → {p.billing_end_date}
                                        </td>
                                        <td>{p.transaction_id || "—"}</td>
                                        <td>
                                            <button
                                                className={styles.btnActionPH}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    background: "#e6f4f3",
                                                    color: "#016161",
                                                }}
                                                onClick={async () => {
                                                    if (expandedUser === u.id) {
                                                        setExpandedUser(null);
                                                    } else {
                                                        await loadHistory(u.id);
                                                        setExpandedUser(u.id);
                                                    }
                                                }}
                                            >
                                                {t("history")}
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        transform: expandedUser === u.id ? "rotate(180deg)" : "rotate(0deg)",
                                                        transition: "transform 0.2s ease",
                                                    }}
                                                >
                                                    <ChevronDown />
                                                </span>
                                            </button>

                                        </td>
                                    </tr>

                                    {/* EXPANDED HISTORY */}
                                    {expandedUser === u.id && (
                                        <tr>
                                            <td colSpan={9}>
                                                <div className={styles.historyExpand}>
                                                    <div className={styles.historyTitle}>
                                                        {t("paymentHistory")}
                                                    </div>

                                                    {historyMap[u.id]?.slice(1).map(h => (
                                                        <div key={h.id} className={styles.historyItem}>
                                                            <div className={styles.historyLabel}>{t("date")}</div>
                                                            <div className={styles.historyValue}>{h.payment_date}</div>

                                                            <div className={styles.historyLabel}>{t("amount")}</div>
                                                            <div className={styles.historyValue}>
                                                                ₹{Number(h.amount).toFixed(2)}
                                                            </div>

                                                            <div className={styles.historyLabel}>{t("paymentType")}</div>
                                                            <div className={styles.historyValue}>{h.payment_type}</div>

                                                            <div className={styles.historyLabel}>{t("paymentMethod")}</div>
                                                            <div className={styles.historyValue}>
                                                                {h.payment_method || "—"}
                                                            </div>

                                                            {h.transaction_id && (
                                                                <>
                                                                    <div className={styles.historyLabel}>{t("transactionId")}</div>
                                                                    <div className={styles.historyValue}>{h.transaction_id}</div>
                                                                </>
                                                            )}

                                                            <div className={styles.historyLabel}>{t("billingPeriod")}</div>
                                                            <div className={styles.historyValue}>
                                                                {h.billing_start_date} → {h.billing_end_date}
                                                            </div>

                                                            <div className={styles.historyLabel}>{t("leave")}</div>
                                                            <div className={styles.historyValue}>{h.leave_days}</div>

                                                            {h.note && (
                                                                <>
                                                                    <div className={styles.historyLabel}>{t("note")}</div>
                                                                    <div className={styles.historyValue}>{h.note}</div>
                                                                </>
                                                            )}
                                                            {h.receipt_pdf_url && (
                                                                <div className={styles.mobilerow}>
                                                                    <button
                                                                        className={styles.btnReceipt}
                                                                        onClick={() => setReceiptModal(h.receipt_pdf_url)}
                                                                    >
                                                                        <Eye size={16} /> {t("view")}
                                                                    </button>

                                                                    <button
                                                                        className={styles.downloadIcon}
                                                                        onClick={() => window.open(h.receipt_pdf_url, "_blank")}
                                                                    >
                                                                        <Download size={16} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>


                                        </tr>
                                    )}
                                </table>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ================= MOBILE CARDS ================= */}
            <div className={styles.mobileList}>
                {loading && <GlobalLoader />}
                {filteredUsers.map(u => {
                    const p = u.latest_payment;
                    if (!p) return null;


                    return (
                        <div key={u.id} className={styles.mobileCard}>
                            <div className={styles.cardRow}>
                                <span className={styles.user}>{u.name}</span>
                                <button
                                    className={styles.btnActionPH}

                                    onClick={async () => {
                                        if (expandedUser === u.id) {
                                            setExpandedUser(null);           // ✅ collapse
                                        } else {
                                            await loadHistory(u.id);         // ✅ lazy load
                                            setExpandedUser(u.id);           // ✅ expand
                                        }
                                    }}
                                >
                                    <span
                                        style={{
                                            display: "inline-block",
                                            transform: expandedUser === u.id ? "rotate(180deg)" : "rotate(0deg)",
                                            transition: "transform 0.25s ease",
                                        }}
                                    >
                                        <ChevronDown size={16} />
                                    </span>
                                </button>


                            </div>

                            <div className={styles.cardRow}>
                                <span>{t("date")}</span>
                                <strong>{p.payment_date}</strong>
                            </div>

                            <div className={styles.cardRow}>
                                <span>{t("amount")}</span>
                                <strong>₹{Number(p.amount).toFixed(2)}</strong>
                            </div>

                            <div className={styles.cardRow}>
                                <span>{t("type")}</span>
                                <strong>{p.payment_type}</strong>
                            </div>

                            <div className={styles.cardRow}>
                                <span>{t("method")}</span>
                                <strong>{p.payment_method}</strong>
                            </div>

                            {p.transaction_id && (
                                <div className={styles.cardRow}>
                                    <span>{t("id")}</span>

                                    <strong
                                        className={styles.truncate}
                                        tabIndex={0}
                                    >
                                        <TooltipText value={p.transaction_id} />
                                    </strong>
                                </div>
                            )}


                            <div className={styles.cardRow}>
                                <span>{t("billingPeriod")}</span>

                                <strong
                                    className={styles.truncate}
                                    tabIndex={0}
                                >
                                    <TooltipText value={`${p.billing_start_date} → ${p.billing_end_date}`} />

                                </strong>
                            </div>
                            {p.receipt_pdf_url && (
                                <div className={styles.mobilerow}>
                                    <button
                                        className={styles.btnReceipt}
                                        onClick={() => setReceiptModal(p.receipt_pdf_url)}
                                    >
                                        <Eye size={16} /> {t("view")}
                                    </button>

                                    <button
                                        className={styles.downloadIcon}
                                        onClick={() => window.open(p.receipt_pdf_url, "_blank")}
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            )}

                            {/* EXPANDED HISTORY */}
                            {expandedUser === u.id && (
                                <div className={styles.mobileHistory}>
                                    <div className={styles.historyTitle}>
                                        {t("paymentHistory")}
                                    </div>

                                    {historyMap[u.id]?.slice(1).map(h => (
                                        <div key={h.id} className={styles.mobileHistoryItem}>
                                            <div className={styles.mobilerow}><span>{t("date")} </span> {h.payment_date} </div>
                                            <div className={styles.mobilerow}><span>{t("amount")} </span>  ₹{Number(h.amount).toFixed(2)}</div>
                                            <div className={styles.mobilerow}><span>{t("type")} </span> {h.payment_type} </div>
                                            <div className={styles.mobilerow}><span>{t("method")} </span> {h.payment_method}</div>
                                            {h.transaction_id && <div className={`${styles.mobilerow}`}><span>{t("id")}</span> <TooltipText value={h.transaction_id} /></div>}
                                            <div className={styles.mobilerow}><span>{t("billingPeriod")}</span><TooltipText value={`${h.billing_start_date} → ${h.billing_end_date}`} /></div>
                                            <div className={styles.mobilerow}><span>{t("leaveDays")}</span> {h.leave_days}</div>
                                            {h.note && <div className={styles.mobilerow}><span>{t("note")} </span> {h.note}</div>}
                                            {h.receipt_pdf_url && (
                                                <div className={styles.mobilerow}>
                                                    <button
                                                        className={styles.btnReceipt}
                                                        onClick={() => setReceiptModal(h.receipt_pdf_url)}
                                                    >
                                                        <Eye size={16} /> {t("view")}
                                                    </button>

                                                    <button
                                                        className={styles.downloadIcon}
                                                        onClick={() => window.open(h.receipt_pdf_url, "_blank")}
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>
            {receiptModal && (
  <div
    className={styles.receiptModalOverlay}
    onClick={() => setReceiptModal(null)}
  >
    <div
      className={styles.receiptModal}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.receiptHeader}>
        <h3>{t("receiptPreview")}</h3>

        <button
          className={styles.downloadIcon}
          onClick={() => window.open(receiptModal, "_blank")}
        >
          Download
        </button>
      </div>

      <iframe
        src={receiptModal}
        className={styles.receiptFrame}
        title="Receipt"
      />
    </div>
  </div>
)}
        </>
    );
}
