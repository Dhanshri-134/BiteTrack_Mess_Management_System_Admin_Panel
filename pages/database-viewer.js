import { useState, useEffect } from 'react';
import styles from '../styles/database-viewer.module.css';

export default function DatabaseViewer() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all tables
  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch('/api/database/tables');
      const data = await response.json();
      if (response.ok) {
        setTables(data.tables);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch tables');
    }
  };

  const fetchTableData = async (tableName) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/database/table-data?table=${tableName}`);
      const data = await response.json();
      if (response.ok) {
        setTableData(data.data);
        setColumns(data.columns);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch table data');
    }
    setLoading(false);
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    fetchTableData(tableName);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🗄️ Database Viewer</h1>
        <p>View your PostgreSQL database tables and data</p>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <h3>Tables</h3>
          <div className={styles.tableList}>
            {tables.map((table) => (
              <button
                key={table}
                className={`${styles.tableItem} ${selectedTable === table ? styles.active : ''}`}
                onClick={() => handleTableSelect(table)}
              >
                📋 {table}
              </button>
            ))}
          </div>
          <button onClick={fetchTables} className={styles.refreshBtn}>
            🔄 Refresh Tables
          </button>
        </div>

        <div className={styles.mainContent}>
          {selectedTable && (
            <div className={styles.tableHeader}>
              <h2>Table: {selectedTable}</h2>
              <span className={styles.recordCount}>
                {tableData.length} records
              </span>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              ❌ {error}
            </div>
          )}

          {loading && (
            <div className={styles.loading}>
              🔄 Loading data...
            </div>
          )}

          {tableData.length > 0 && !loading && (
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.name}>
                        {column.name}
                        <span className={styles.columnType}>
                          ({column.type})
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column.name}>
                          {row[column.name] === null ? (
                            <span className={styles.nullValue}>NULL</span>
                          ) : (
                            String(row[column.name])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTable && tableData.length === 0 && !loading && !error && (
            <div className={styles.emptyState}>
              📭 No data found in table "{selectedTable}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}