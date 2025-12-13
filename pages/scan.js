import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Scanner({ onAttendanceMarked }) {
  const scannerRef = useRef(null);
  const scannerInstance = useRef(null);
  const [lastScan, setLastScan] = useState(null);

  useEffect(() => {
    if (!scannerRef.current) return;

    // Give the div an ID
    const elementId = "qr-scanner-div";
    scannerRef.current.id = elementId;

    const scanner = new Html5QrcodeScanner(elementId, {
      fps: 10,
      qrbox: 250,
      rememberLastUsedCamera: true,
    });
    scannerInstance.current = scanner;

    scanner.render(handleScanSuccess, handleScanError);

    return () => {
      // Cleanup
      if (scannerInstance.current) {
        scannerInstance.current.clear().catch((err) => {
          console.warn("Scanner cleanup failed", err);
        });
      }
    };
  }, []);

  const handleScanSuccess = async (decodedText) => {
    if (decodedText === lastScan) return; // Avoid duplicates
    setLastScan(decodedText);

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr: decodedText }),
      });
      const data = await res.json();

      if (data.ok) {
        alert(`Attendance marked: ${data.name} (${data.date})`);
        if (onAttendanceMarked) onAttendanceMarked();
      } else {
        alert(data.error || "Failed to mark attendance");
      }
    } catch (err) {
      console.error(err);
      alert("Error marking attendance");
    }
  };

  const handleScanError = (err) => {
    console.warn("QR scan error", err);
  };

  return (
    <div>
      <h2>QR Scanner</h2>
      <div
        ref={scannerRef}
        style={{ width: "100%", maxWidth: "400px", margin: "auto" }}
      />
    </div>
  );
}
