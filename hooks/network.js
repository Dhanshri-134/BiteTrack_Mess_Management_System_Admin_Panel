// import { Network } from "@capacitor/network";

// export async function isOnline() {
//   const status = await Network.getStatus();
//   return status.connected;
// }

// export function listenNetwork(callback) {
//   Network.addListener("networkStatusChange", callback);
// }
import { Network } from "@capacitor/network";
import { useEffect, useState } from "react";

export function useNetwork() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    Network.getStatus().then(s => setOnline(s.connected));
    const listener = Network.addListener("networkStatusChange", s =>
      setOnline(s.connected)
    );
    return () => listener.remove();
  }, []);

  return online;
}
