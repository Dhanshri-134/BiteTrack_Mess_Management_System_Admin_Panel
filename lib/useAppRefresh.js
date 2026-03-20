import { useEffect } from "react";

export function useAppRefresh(callback) {
  useEffect(() => {
    window.addEventListener("APP_REFRESH", callback);
    return () => {
      window.removeEventListener("APP_REFRESH", callback);
    };
  }, [callback]);
}
