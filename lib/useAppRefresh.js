import { useEffect } from "react";
import toast from "react-hot-toast";

export function useAppRefresh(callback) {
  useEffect(() => {
    const handler = () => {
      callback();
    };
    window.addEventListener("APP_REFRESH", callback);
    return () => {
      window.removeEventListener("APP_REFRESH", callback);
    };
  }, [callback]);
}
