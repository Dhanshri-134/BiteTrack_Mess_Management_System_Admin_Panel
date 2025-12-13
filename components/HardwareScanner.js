import { useEffect, useRef, useState } from "react";

export default function HardwareScanner({ onScan }) {
  const buffer = useRef("");
  const timeout = useRef(null);
  const [currentBuffer, setCurrentBuffer] = useState("");

  useEffect(() => {
    const handleKeydown = (e) => {
      // Only capture printable characters
      if (e.key.length === 1) {
        buffer.current += e.key;
        setCurrentBuffer(buffer.current);
      }

      // Enter key triggers scan
      if (e.key === "Enter") {
        if (buffer.current.length > 0) {
          onScan(buffer.current.trim());
          buffer.current = "";
          setCurrentBuffer("");
        }
        e.preventDefault(); // prevent form submissions
      }

      // Reset buffer if idle for 500ms
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        buffer.current = "";
        setCurrentBuffer("");
      }, 500);
    };

    // Use capture phase for early detection
    window.addEventListener("keydown", handleKeydown, true);
    return () => window.removeEventListener("keydown", handleKeydown, true);
  }, [onScan]);

  return (
    <div style={{ marginTop: "10px" }}>
      <p style={{ fontStyle: "italic", color: "#666" }}>
        Ready for hardware scanner input...
      </p>
      {currentBuffer && <p>Buffer: {currentBuffer}</p>}
    </div>
  );
}
