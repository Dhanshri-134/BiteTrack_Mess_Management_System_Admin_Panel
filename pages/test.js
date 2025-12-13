import { useEffect } from "react";

export default function HardwareScannerTest() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log("Key pressed:", e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div style={{ marginTop: "2rem", color: "#555" }}>
      <p>Listening for keyboard input... try scanning a QR now.</p>
    </div>
  );
}
