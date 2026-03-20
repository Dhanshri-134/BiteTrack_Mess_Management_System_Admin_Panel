import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../../../../styles/table.module.css";
import { inventoryOfflineRequest } from "@/lib/inventoryClient";
import { useAppRefresh } from "@/lib/useAppRefresh";
import { useLanguage } from "@/context/LanguageContext";

export default function StockLedger() {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (id) loadLedger();
  }, [id]);

  useAppRefresh(() => {
    if (id) loadLedger();
  });

  async function loadLedger() {
    try {
      const result = await inventoryOfflineRequest(
        `inventory-item-ledger-v2-${id}`,
        "/api/inventory/getStockLedger/",
        { body: { item_id: id } }
      );
      if (result.success) setRows(result.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("date")}</th>
            <th>{t("type")}</th>
            <th>{t("quantity")}</th>
            <th>{t("notes")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.created_at}-${index}`}>
              <td>{new Date(row.created_at).toLocaleDateString()}</td>
              <td>{row.transaction_type}</td>
              <td>{row.quantity}</td>
              <td>{row.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
