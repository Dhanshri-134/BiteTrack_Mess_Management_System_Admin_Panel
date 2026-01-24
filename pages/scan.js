import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { queueAction } from "@/lib/queueAction";
import toast from "react-hot-toast";

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
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized. Please login again.");
        return;
      }

      const res = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/attendance/mark/", {
        method: "POST",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ qr: decodedText }),
      });
      const data = await res.json();

      if (res.ok) {
  toast(data.message);
  onAttendanceMarked?.(decodedText);
} else {
  toast(data.error || data.message || "Failed to mark attendance");
}

    } catch (err) {
      // console.error(err);
      // alert("Error marking attendance");
      await queueAction({
        type: "ATTENDANCE_SCAN",
        payload: { qr: decodedText },
      });

      toast("Attendance saved offline");
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
