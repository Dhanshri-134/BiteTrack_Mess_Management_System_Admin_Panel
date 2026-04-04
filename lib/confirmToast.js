import toast from "react-hot-toast";

export function confirmToast(message, options = {}) {
  const {
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    duration = 10000,
  } = options;

  return new Promise((resolve) => {
    const toastId = toast.custom(
      (instance) => (
        <div
          style={{
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: "14px",
            boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18)",
            border: "1px solid #dbe7e7",
            padding: "14px",
            width: "min(92vw, 360px)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "12px", lineHeight: 1.45 }}>
            {message}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(instance.id);
                resolve(false);
              }}
              style={{
                background: "#f1f5f9",
                color: "#334155",
                border: "none",
                borderRadius: "10px",
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(instance.id);
                resolve(true);
              }}
              style={{
                background: "#007170",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      {
        id: `confirm-${Date.now()}`,
        duration,
      }
    );

    if (!toastId) {
      resolve(false);
    }
  });
}
